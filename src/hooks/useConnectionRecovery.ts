import {useEffect,useState} from "react";
import {networkSnapshot,subscribeNetwork} from "@/services/networkStatus";
/** Retry public reads on actual recovery, without a timer or page remount. */
export default function useConnectionRecovery(){
    const [attempt,setAttempt]=useState(0);
    useEffect(()=>{
        const retry=()=>setAttempt(value=>value+1);
        const unsubscribe=subscribeNetwork(()=>{if(networkSnapshot()==="connected")retry();});
        window.addEventListener("online",retry);window.addEventListener("drz:retry",retry);
        return()=>{unsubscribe();window.removeEventListener("online",retry);window.removeEventListener("drz:retry",retry);};
    },[]);
    return attempt;
}
