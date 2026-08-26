const allowedOrigins = new Set([
  "https://gankbyte.com",
  "https://www.gankbyte.com",
  "http://localhost:3000",
  "http://localhost:5173"
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://gankbyte.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function response(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return response(request, { error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFrom = Deno.env.get("RESEND_FROM") || "GankByte <contact@gankbyte.com>";
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    return response(request, { error: "The request service is not configured." }, 503);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return response(request, { error: "Invalid request body." }, 400);
  }

  const name = String(input.name || "").trim();
  const email = String(input.email || "").trim();
  const details = String(input.details || "").trim();
  const planMarkdown = String(input.plan_markdown || "").trim();
  const source = String(input.source || "fivem-script-generator").slice(0, 80);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (name.length < 2 || name.length > 80) return response(request, { error: "Enter a valid name or Discord username." }, 400);
  if (!emailPattern.test(email) || email.length > 160) return response(request, { error: "Enter a valid contact email." }, 400);
  if (details.length < 10 || details.length > 2000) return response(request, { error: "Add at least a little more detail about the request." }, 400);
  if (!planMarkdown || planMarkdown.length > 30000) return response(request, { error: "The generated plan is invalid or too large." }, 400);

  const adminHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
  const insert = await fetch(`${supabaseUrl}/rest/v1/custom_script_requests`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      name,
      email,
      details,
      plan: input.plan || {},
      plan_markdown: planMarkdown,
      source
    })
  });
  if (!insert.ok) return response(request, { error: "The request could not be saved." }, 502);

  const saved = await insert.json().catch(() => []);
  const requestId = saved?.[0]?.id;
  const subject = `Custom FiveM script request - ${name}`;
  const emailHtml = `<h2>${escapeHtml(subject)}</h2><p><strong>Name / Discord:</strong> ${escapeHtml(name)}<br><strong>Contact email:</strong> ${escapeHtml(email)}<br><strong>Request ID:</strong> ${escapeHtml(requestId)}</p><h3>Requested work</h3><p>${escapeHtml(details).replaceAll("\n", "<br>")}</p><h3>Generated plan</h3><pre style="white-space:pre-wrap;font-family:monospace">${escapeHtml(planMarkdown)}</pre>`;
  const send = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: resendFrom, to: ["contact@gankbyte.com"], reply_to: email, subject, html: emailHtml })
  });

  if (!send.ok) {
    if (requestId) {
      await fetch(`${supabaseUrl}/rest/v1/custom_script_requests?id=eq.${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        headers: { ...adminHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ status: "delivery_failed", updated_at: new Date().toISOString() })
      });
    }
    return response(request, { error: "The request was saved, but the notification email could not be sent." }, 502);
  }

  return response(request, { ok: true, request_id: requestId }, 201);
});
