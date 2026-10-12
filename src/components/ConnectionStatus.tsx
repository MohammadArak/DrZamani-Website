import { useSyncExternalStore } from "react";
import { networkSnapshot, retryNetwork, subscribeNetwork } from "@/services/networkStatus";
import StatusPage from "./StatusPage";
export default function ConnectionStatus(){
    const status=useSyncExternalStore(subscribeNetwork,networkSnapshot,()=>"connected" as const);
    return status==="connected" ? null : <StatusPage kind={status} onRetry={retryNetwork} overlay />;
}
