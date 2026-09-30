import { useEffect, useRef, useState } from "react";
import { PATIENT_COOKIE_SESSION, STAFF_COOKIE_SESSION } from "@/services/appointmentApi";

const API_BASE = (import.meta.env.VITE_APPOINTMENT_API_URL ?? "/api/v1").replace(
    /\/$/,
    "",
);

export type ConsultationRealtimeEvent = {
    type: "consultation.message";
    appointment_id: number;
    message_id: number;
    sender_type: "patient" | "staff";
};

export type RealtimeStatus = "connecting" | "live" | "offline";

const realtimeUrl = () => {
    const url = new URL(`${API_BASE}/realtime`, window.location.origin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
};

const useConsultationRealtime = (
    token: string,
    onEvent: (event: ConsultationRealtimeEvent) => void,
    enabled = true,
) => {
    const callbackRef = useRef(onEvent);
    const [status, setStatus] = useState<RealtimeStatus>("connecting");

    useEffect(() => {
        callbackRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        if (!enabled || !token) {
            return;
        }
        let disposed = false;
        let socket: WebSocket | null = null;
        let reconnectTimer = 0;
        let reconnectDelay = 800;

        const connect = () => {
            if (disposed) return;
            setStatus("connecting");
            socket = new WebSocket(realtimeUrl());
            socket.addEventListener("open", () => {
                const audience = token === STAFF_COOKIE_SESSION ? "staff" : "patient";
                socket?.send(JSON.stringify(
                    token === STAFF_COOKIE_SESSION || token === PATIENT_COOKIE_SESSION ? { audience } : { token },
                ));
            });
            socket.addEventListener("message", (message) => {
                try {
                    const event = JSON.parse(String(message.data)) as {
                        type?: string;
                        appointment_id?: number;
                        message_id?: number;
                        sender_type?: string;
                    };
                    if (event.type === "realtime.ready") {
                        reconnectDelay = 800;
                        setStatus("live");
                    } else if (
                        event.type === "consultation.message" &&
                        typeof event.appointment_id === "number" &&
                        typeof event.message_id === "number" &&
                        (event.sender_type === "patient" || event.sender_type === "staff")
                    ) {
                        callbackRef.current(event as ConsultationRealtimeEvent);
                    }
                } catch {
                    // Ignore malformed or forward-compatible realtime events.
                }
            });
            socket.addEventListener("close", () => {
                if (disposed) return;
                setStatus("offline");
                reconnectTimer = window.setTimeout(connect, reconnectDelay);
                reconnectDelay = Math.min(reconnectDelay * 2, 10_000);
            });
            socket.addEventListener("error", () => socket?.close());
        };

        connect();
        return () => {
            disposed = true;
            window.clearTimeout(reconnectTimer);
            socket?.close();
        };
    }, [enabled, token]);

    return enabled && token ? status : "offline";
};

export default useConsultationRealtime;
