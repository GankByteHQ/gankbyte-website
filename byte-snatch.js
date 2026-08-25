const canvas = document.querySelector("#snatch-canvas");
const ctx = canvas.getContext("2d");
const startButton = document.querySelector("#start-button");
const bankButton = document.querySelector("#bank-button");
const message = document.querySelector("#arena-message");
const status = document.querySelector("#game-status");
const scoreValue = document.querySelector("#score");
const riskValue = document.querySelector("#risk");
const timeValue = document.querySelector("#time");
const comboValue = document.querySelector("#combo");
const livesValue = document.querySelector("#lives");
const xpValue = document.querySelector("#xp");
const powerValue = document.querySelector("#power-status");
const authStatus = document.querySelector("#arena-auth-status");
const loginButton = document.querySelector("#arena-login");
const logoutButton = document.querySelector("#arena-logout");
const submitButton = document.querySelector("#arena-submit");
const resultActions = document.querySelector("#arena-result-actions");
const resultRank = document.querySelector("#arena-result-rank");
const resultCard = document.querySelector("#arena-result-card");
const resultScore = document.querySelector("#arena-result-card-score");
const resultDetail = document.querySelector("#arena-result-card-detail");
const resultNote = document.querySelector("#arena-result-card-note");
const leaderboardBody = document.querySelector("#arena-leaderboard-body");
const shareButton = document.querySelector("#arena-share-result");
const config = window.GANKBYTE_XP_CONFIG || {};
const bestKey = "gankbyte-byte-snatch-best";
const lastPlayedKey = "gankbyte-byte-snatch-last-played";
const coarse = window.matchMedia?.("(pointer: coarse)").matches || false;
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const touch = new Set();
let player, running = false, lastFrame = 0, elapsed = 0, timeLeft = 60;
let banked = 0, risk = 0, multiplier = 1, lives = 3, xp = 0, power = null;
let bytes = [], enemies = [], particles = [], pointerTarget = null, gestureStart = null;
let client = null, user = null, lastRun = null;

const random = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrap = (value, size) => (value + size) % size;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));

function updateHud() {
  scoreValue.textContent = Math.round(banked).toLocaleString(); riskValue.textContent = Math.round(risk).toLocaleString();
  timeValue.textContent = Math.ceil(timeLeft); comboValue.textContent = `x${multiplier}`; livesValue.textContent = lives; xpValue.textContent = xp;
  powerValue.textContent = power ? power.label : "NONE";
}
function localBest() { return Number(localStorage.getItem(bestKey) || 0); }
function spawnByte() { bytes.push({ x: random(35, WIDTH - 35), y: random(45, HEIGHT - 35), value: Math.random() < .08 ? 500 : Math.random() < .22 ? 250 : 100, pulse: random(0, 6) }); }
function spawnEnemy() { const edge = Math.floor(random(0, 4)); const p = edge === 0 ? {x:random(0,WIDTH),y:-25} : edge === 1 ? {x:WIDTH+25,y:random(0,HEIGHT)} : edge === 2 ? {x:random(0,WIDTH),y:HEIGHT+25} : {x:-25,y:random(0,HEIGHT)}; enemies.push({...p, radius:random(13,20), speed:random(40,65) + elapsed * .8, phase:random(0,6)}); }
function burst(x, y, color, count=16) { for(let i=0;i<count;i++) { const a=random(0,Math.PI*2), s=random(30,150); particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:random(.3,.8),color,size:random(2,5)}); } }
function reset() {
  running = false; elapsed = 0; timeLeft = 60; banked = 0; risk = 0; multiplier = 1; lives = 3; xp = 0; power = null; bytes=[]; enemies=[]; particles=[]; pointerTarget=null; gestureStart=null;
  player = {x:WIDTH/2,y:HEIGHT/2,radius:15,invulnerable:0,speed:coarse?225:260};
  for(let i=0;i<9;i++) spawnByte(); for(let i=0;i<3;i++) spawnEnemy(); updateHud();
  resultActions.hidden = true; submitButton.hidden = true; resultCard.hidden = true;
}
function move(dx, dy) { const nx = wrap(player.x + dx, WIDTH), ny = wrap(player.y + dy, HEIGHT); player.x=nx; player.y=ny; }
function moveVector() { let x=0,y=0; if(keys.has("ArrowLeft")||keys.has("a")||touch.has("left"))x--; if(keys.has("ArrowRight")||keys.has("d")||touch.has("right"))x++; if(keys.has("ArrowUp")||keys.has("w")||touch.has("up"))y--; if(keys.has("ArrowDown")||keys.has("s")||touch.has("down"))y++; const n=Math.hypot(x,y)||1; return {x:x/n,y:y/n,moving:x!==0||y!==0}; }
function bankScore() { if(!running || risk<=0) return; banked += Math.round(risk); risk=0; multiplier=Math.min(10,multiplier+1); xp+=15; localStorage.setItem("gankbyte-achievement-byte-snatch", "earned"); status.textContent=`Score banked safely. Multiplier is now x${multiplier}.`; burst(player.x,player.y,"#c6ff3d",24); updateHud(); }
function collectByte(item) { const value = item.value * multiplier; risk += value; xp += Math.max(2, Math.round(item.value/50)); multiplier=Math.min(10,multiplier + (item.value >= 500 ? 2 : 1)); status.textContent=`${item.value} Byte grabbed. Bank it before you get ganked.`; burst(item.x,item.y,item.value>=500?"#ffb347":"#c6ff3d",18); }
function takeHit() { if(player.invulnerable>0)return; lives--; risk=0; multiplier=1; player.invulnerable=1.2; status.textContent=lives?"GANKED. At-risk score lost.":"No lives left."; burst(player.x,player.y,"#ff855c",28); if(!lives) finish(); }
function update(dt) {
  elapsed+=dt; timeLeft=Math.max(0,60-elapsed); player.invulnerable=Math.max(0,player.invulnerable-dt);
  const v=moveVector(); if(v.moving) move(v.x*player.speed*dt,v.y*player.speed*dt); else if(pointerTarget){const dx=pointerTarget.x-player.x,dy=pointerTarget.y-player.y,n=Math.hypot(dx,dy);if(n<8)pointerTarget=null;else move(dx/n*player.speed*dt,dy/n*player.speed*dt);}
  if(enemies.length < 3 + Math.floor(elapsed/8) && Math.random()<dt*1.2) spawnEnemy();
  enemies.forEach((enemy)=>{ const a=Math.atan2(player.y-enemy.y,player.x-enemy.x); enemy.x+=Math.cos(a)*enemy.speed*dt; enemy.y+=Math.sin(a)*enemy.speed*dt; enemy.phase+=dt; if(distance(player,enemy)<player.radius+enemy.radius) takeHit(); });
  bytes=bytes.filter((item)=>{item.pulse+=dt*4;if(distance(player,item)<player.radius+14){collectByte(item);return false;}return true;});
  while(bytes.length<9)spawnByte();
  particles=particles.filter((p)=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;return p.life>0;});
  updateHud(); if(timeLeft<=0)finish();
}
function finish() {
  if(!running)return; running=false; banked += Math.round(risk); risk = 0; const total=Math.round(banked); const best=localBest(); const isBest=total>best; if(isBest)localStorage.setItem(bestKey,String(total)); localStorage.setItem(lastPlayedKey,new Date().toISOString());
  lastRun={score:total,multiplier,runSeconds:Math.round(elapsed),submitted:false}; message.hidden=false; message.innerHTML=`<strong>RUN COMPLETE</strong><span>${total.toLocaleString()} banked // x${multiplier} max multiplier</span>`; startButton.innerHTML="Run it again  <span>&rarr;</span>"; submitButton.hidden=false; resultActions.hidden=false; resultCard.hidden=false; resultScore.textContent=total.toLocaleString(); resultDetail.textContent=`x${multiplier} multiplier // ${Math.round(elapsed)} seconds`; resultNote.textContent=isBest?"New personal best. Share the run.":"Keep moving. Beat your best next run."; resultRank.textContent=user?"Submitting run...":"Sign in to submit and rank this run."; status.textContent=isBest?`New best score: ${total}.`:`Best score on this device: ${Math.max(best,total)}.`; submitScore();
}
function start() { reset(); running=true; message.hidden=true; startButton.innerHTML="Restart run  <span>&rarr;</span>"; status.textContent="Collect Bytes. Bank often. Survive the glitches."; canvas.focus(); beginVerifiedRun(); }
function draw() { ctx.fillStyle="#0d1015";ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.strokeStyle="rgba(244,242,234,.055)";for(let x=0;x<=WIDTH;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke();}for(let y=0;y<=HEIGHT;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);ctx.stroke();} bytes.forEach((item)=>{const p=1+Math.sin(item.pulse)*.12;ctx.save();ctx.translate(item.x,item.y);ctx.rotate(Math.PI/4);ctx.shadowBlur=22;ctx.shadowColor=item.value>=500?"#ffb347":"#c6ff3d";ctx.fillStyle=item.value>=500?"#ffb347":"#c6ff3d";ctx.fillRect(-9*p,-9*p,18*p,18*p);ctx.restore();ctx.fillStyle="#0a0b0f";ctx.font="bold 8px Arial";ctx.textAlign="center";ctx.fillText(item.value>=500?"M":"B",item.x,item.y+3);}); enemies.forEach((e)=>{ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.phase);ctx.shadowBlur=22;ctx.shadowColor="#9a7bff";ctx.strokeStyle="#9a7bff";ctx.fillStyle="rgba(154,123,255,.2)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-e.radius);ctx.lineTo(e.radius,0);ctx.lineTo(0,e.radius);ctx.lineTo(-e.radius,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}); particles.forEach((p)=>{ctx.globalAlpha=Math.max(0,p.life/.8);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);});ctx.globalAlpha=1;if(player){ctx.save();ctx.translate(player.x,player.y);ctx.globalAlpha=player.invulnerable>0&&Math.floor(player.invulnerable*12)%2===0?.4:1;ctx.shadowBlur=28;ctx.shadowColor="#c6ff3d";ctx.fillStyle="#c6ff3d";ctx.beginPath();ctx.moveTo(0,-22);ctx.lineTo(16,17);ctx.lineTo(0,11);ctx.lineTo(-16,17);ctx.closePath();ctx.fill();ctx.restore();}ctx.fillStyle="rgba(198,255,61,.75)";ctx.font="10px Arial";ctx.textAlign="left";ctx.fillText(`BANKED ${Math.round(banked).toLocaleString()} // RISK ${Math.round(risk).toLocaleString()}`,18,HEIGHT-18);}
function frame(ts){const dt=Math.min((ts-lastFrame)/1000||0,.05);lastFrame=ts;if(running)update(dt);draw();requestAnimationFrame(frame);}
async function loadLeaderboard(){if(!client){leaderboardBody.innerHTML='<tr><td colspan="4">Global scores need the XP backend connection.</td></tr>';return;}const result=await client.from("byte_snatch_leaderboard").select("display_name,best_score,best_multiplier").order("best_score",{ascending:false}).limit(25);if(result.error){leaderboardBody.innerHTML='<tr><td colspan="4">Global scores are not available yet.</td></tr>';return;}leaderboardBody.innerHTML=result.data?.length?result.data.map((row,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(row.display_name||"GankByte Player")}</td><td>${Number(row.best_score||0).toLocaleString()}</td><td>x${Number(row.best_multiplier||1)}</td></tr>`).join(""):'<tr><td colspan="4">No scores yet. Be the first to bank a run.</td></tr>';}
async function beginVerifiedRun(){return;}
async function submitScore(){if(!client||!user||!lastRun||lastRun.submitted)return;const result=await client.from("byte_snatch_scores").insert({user_id:user.id,score:lastRun.score,best_multiplier:lastRun.multiplier,run_seconds:lastRun.runSeconds,xp_earned:Math.min(250,Math.max(0,Math.round(lastRun.score/100))) ,status:"approved"});if(result.error){authStatus.textContent="Score could not be submitted. Try again while signed in.";return;}lastRun.submitted=true;authStatus.textContent="Score posted to the global leaderboard and XP recorded.";await loadLeaderboard();}
async function loadSession(session){user=session?.user||null;if(!user){authStatus.textContent="Sign in with Discord to submit scores.";loginButton.hidden=false;logoutButton.hidden=true;return;}const name=user.user_metadata?.global_name||user.user_metadata?.full_name||"Discord player";authStatus.textContent=`Signed in as ${name}. Scores post automatically.`;loginButton.hidden=true;logoutButton.hidden=false;await submitScore();}
async function initOnline(){if(!config.supabaseUrl||!config.supabasePublishableKey||!window.supabase){loginButton.disabled=true;return;}client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey);client.auth.onAuthStateChange((event,session)=>window.setTimeout(()=>loadSession(session),0));const result=await client.auth.getSession();await loadSession(result.data.session);await loadLeaderboard();}
function setPointer(event){if(!running)return;const rect=canvas.getBoundingClientRect();pointerTarget={x:(event.clientX-rect.left)*WIDTH/rect.width,y:(event.clientY-rect.top)*HEIGHT/rect.height};}
window.addEventListener("keydown",(event)=>{if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(event.key))event.preventDefault();if(event.key.toLowerCase()==="b"||event.key===" "){bankScore();return;}keys.add(event.key);});window.addEventListener("keyup",(event)=>keys.delete(event.key));
canvas.addEventListener("pointerdown",(event)=>{event.preventDefault();setPointer(event);gestureStart={x:event.clientX,y:event.clientY,pointerType:event.pointerType};canvas.setPointerCapture?.(event.pointerId);});canvas.addEventListener("pointermove",(event)=>{if(event.buttons){event.preventDefault();setPointer(event);}});canvas.addEventListener("pointerup",(event)=>{if(gestureStart?.pointerType==="touch"&&running){const dx=event.clientX-gestureStart.x,dy=event.clientY-gestureStart.y;if(Math.hypot(dx,dy)>28)pointerTarget={x:wrap(player.x+dx/Math.hypot(dx,dy)*260,WIDTH),y:wrap(player.y+dy/Math.hypot(dx,dy)*260,HEIGHT)};}gestureStart=null;});
startButton.addEventListener("click",start);bankButton.addEventListener("click",bankScore);loginButton.addEventListener("click",async()=>{if(client)await client.auth.signInWithOAuth({provider:"discord",options:{redirectTo:window.location.origin+window.location.pathname}});});logoutButton.addEventListener("click",async()=>{if(client)await client.auth.signOut();});shareButton?.addEventListener("click",async()=>{if(!lastRun)return;const text=`I banked ${lastRun.score.toLocaleString()} in Byte Snatch at GankByte.`;try{if(navigator.share)await navigator.share({title:"Byte Snatch result",text,url:window.location.href});else{await navigator.clipboard.writeText(`${text} ${window.location.href}`);status.textContent="Result copied to clipboard.";}}catch(error){if(error?.name!=="AbortError")status.textContent="Could not share this result.";}});
document.querySelectorAll("[data-dir]").forEach((button)=>{const dir=button.dataset.dir;const press=(event)=>{event.preventDefault();if(dir==="bank")bankScore();else touch.add(dir);};const release=(event)=>{event.preventDefault();touch.delete(dir);};button.addEventListener("pointerdown",press);button.addEventListener("pointerup",release);button.addEventListener("pointerleave",release);button.addEventListener("pointercancel",release);});
reset();status.textContent=localBest()?`Best score on this device: ${localBest()}.`:"No best score yet. Start a run.";initOnline().catch(()=>{authStatus.textContent="Online scores are unavailable, but local play is still ready.";});requestAnimationFrame(frame);
