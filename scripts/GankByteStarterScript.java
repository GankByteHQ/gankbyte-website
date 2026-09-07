package com.gankbyte.scripts;

/**
 * Minimal starter script for the GankByte client.
 *
 * The client will provide the GankByteApi implementation when script loading
 * is connected. This file is intentionally small so it is easy to extend.
 */
public final class GankByteStarterScript implements Script {

    private GankByteApi api;

    @Override
    public void onStart(GankByteApi api) {
        this.api = api;
        api.log("GankByte starter script started");
    }

    @Override
    public int onLoop() {
        api.log("Starter script loop is running");
        return 600;
    }

    @Override
    public void onStop() {
        api.log("GankByte starter script stopped");
    }

    public interface Script {
        void onStart(GankByteApi api);
        int onLoop();
        void onStop();
    }

    public interface GankByteApi {
        void log(String message);
    }
}
