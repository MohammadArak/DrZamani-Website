import {useEffect,useRef,type RefObject} from "react";

// Leases restore the original state even if nested overlays unmount in parent-first order.
const isolation=new WeakMap<HTMLElement,{count:number;inert:boolean;hidden:string|null}>();
let scrollLeases=0,originalOverflow="";
const isolate=(element:HTMLElement)=>{
    const existing=isolation.get(element);
    if(existing)existing.count++;
    else isolation.set(element,{count:1,inert:element.inert,hidden:element.getAttribute("aria-hidden")});
    element.inert=true;element.setAttribute("aria-hidden","true");
};
const release=(element:HTMLElement)=>{
    const state=isolation.get(element);if(!state||--state.count)return;
    element.inert=state.inert;
    if(state.hidden===null)element.removeAttribute("aria-hidden");else element.setAttribute("aria-hidden",state.hidden);
    isolation.delete(element);
};

/** Focus, scroll and background isolation for overlays that keep the underlying draft mounted. */
export default function useModalScope<T extends HTMLElement>(enabled=true,onClose?:()=>void,closeDisabled=false,initialFocus?:RefObject<HTMLElement|null>){
    const root=useRef<T>(null);
    const latest=useRef({onClose,closeDisabled});
    useEffect(()=>{latest.current={onClose,closeDisabled};},[onClose,closeDisabled]);
    useEffect(()=>{
        const element=root.current;if(!enabled||!element)return;
        const previous=document.activeElement as HTMLElement|null;
        const saved:HTMLElement[]=[];
        let branch:HTMLElement|null=element;
        while(branch&&branch!==document.body){
            const parent:HTMLElement|null=branch.parentElement;if(!parent)break;
            for(const sibling of parent.children){
                if(sibling===branch||!(sibling instanceof HTMLElement)||["STYLE","SCRIPT","LINK"].includes(sibling.tagName))continue;
                saved.push(sibling);isolate(sibling);
            }
            branch=parent;
        }
        if(scrollLeases++===0)originalOverflow=document.documentElement.style.overflow;
        document.documentElement.style.overflow="hidden";
        const controls=()=>[...element.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]')]
            .filter(node=>!node.matches('[disabled],[tabindex="-1"]')&&!node.closest('[inert]')&&node.getClientRects().length>0);
        (initialFocus?.current??controls()[0]??element).focus();
        const keys=(event:KeyboardEvent)=>{
            if(event.defaultPrevented)return;
            if(event.key==="Escape"&&latest.current.onClose&&!latest.current.closeDisabled){event.preventDefault();event.stopPropagation();latest.current.onClose();}
            if(event.key!=="Tab")return;
            const items=controls();const first=items[0],last=items[items.length-1];
            if(!first){event.preventDefault();element.focus();}
            else if(event.shiftKey&&(document.activeElement===first||document.activeElement===element)){event.preventDefault();last.focus();}
            else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===element)){event.preventDefault();first.focus();}
        };
        // Both ends must be on the backdrop: dragging a selection out of a form
        // must not dismiss it. Inert parents cannot dismiss a nested modal.
        const isBackdrop=(target:EventTarget|null)=>target===element || target instanceof HTMLElement&&target.hasAttribute("data-modal-backdrop")&&target.closest('[aria-modal="true"]')===element;
        let pressed=false;
        const pointer=(event:PointerEvent)=>{pressed=event.button===0&&isBackdrop(event.target);};
        const click=(event:MouseEvent)=>{
            const dismiss=pressed&&isBackdrop(event.target);pressed=false;
            if(dismiss&&!element.inert&&!element.closest('[aria-hidden="true"]')&&!latest.current.closeDisabled)latest.current.onClose?.();
        };
        element.addEventListener("pointerdown",pointer);
        element.addEventListener("click",click);
        element.addEventListener("keydown",keys);
        return()=>{
            element.removeEventListener("keydown",keys);
            element.removeEventListener("pointerdown",pointer);
            element.removeEventListener("click",click);
            for(const item of saved)release(item);
            if(--scrollLeases===0)document.documentElement.style.overflow=originalOverflow;
            // Restore after every overlay in this React commit has released its isolation lease.
            queueMicrotask(()=>{
                if(previous?.isConnected&&previous!==document.body&&!previous.closest("[inert]")){previous.focus();return;}
                if(scrollLeases)return;
                // Another overlay in this commit may already have returned focus to its trigger.
                const active=document.activeElement;
                if(active&&active!==document.body&&active!==element&&!active.closest("[inert]"))return;
                const fallback=document.querySelector<HTMLElement>("main h1,main");
                if(!fallback||fallback.closest("[inert]"))return;
                const tabIndex=fallback.getAttribute("tabindex");
                fallback.tabIndex=-1;fallback.focus({preventScroll:true});
                fallback.addEventListener("blur",()=>{if(tabIndex===null)fallback.removeAttribute("tabindex");else fallback.setAttribute("tabindex",tabIndex);},{once:true});
            });
        };
    },[enabled,initialFocus]);
    return root;
}
