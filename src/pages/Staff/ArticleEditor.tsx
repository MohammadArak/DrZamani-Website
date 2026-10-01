import {useEffect,useState} from "react";
import {useEditor,EditorContent} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {TableKit} from "@tiptap/extension-table";
import {safeContentHtml,type Media} from "@/services/contentApi";
import MediaPicker from "./MediaPicker";

const LibraryImage=Image.extend({addNodeView(){return ({node})=>{
    const img=document.createElement("img");
    const update=(attrs:Record<string,unknown>)=>{const src=String(attrs.src??"");const key=src.match(/^\/media\/([a-f0-9]{32})\.webp$/)?.[1];img.src=key?`/api/v1/staff/media/${key}/file`:"";img.alt=String(attrs.alt??"");};
    update(node.attrs);return {dom:img,update(next){if(next.type!==node.type)return false;update(next.attrs);return true;}};
};}});

export default function ArticleEditor({html,onChange,token,editable,canUseMedia}:{html:string;onChange:(value:string)=>void;token:string;editable:boolean;canUseMedia:boolean}){
    const [source,setSource]=useState(false);const [link,setLink]=useState("");const [selected,setSelected]=useState<Media|null>(null);
    const [linkError,setLinkError]=useState("");
    const editor=useEditor({extensions:[StarterKit.configure({heading:{levels:[2,3,4]},link:{openOnClick:false,autolink:false,protocols:["https"]}}),LibraryImage.configure({allowBase64:false}),TableKit],content:safeContentHtml(html),editable,
        editorProps:{attributes:{dir:"rtl",lang:"fa","aria-label":"متن مقاله","role":"textbox","aria-multiline":"true"},transformPastedHTML:value=>safeContentHtml(value)},
        onUpdate:({editor:active})=>{if(editable)onChange(active.getHTML());}});
    useEffect(()=>{if(editor&&editor.getHTML()!==html&&!source)editor.commands.setContent(safeContentHtml(html),{emitUpdate:false});},[html,editor,source]);
    useEffect(()=>{editor?.setEditable(editable,false);},[editor,editable]);
    if(!editor)return null;
    const button=(label:string,action:()=>void,active=false)=><button type="button" disabled={!editable} aria-pressed={active} onClick={action}>{label}</button>;
    return <section className="editor-shell" aria-label="ویرایشگر مقاله">
        <div className="editor-toolbar" role="toolbar" aria-label="قالب متن">
            {button("پاراگراف",()=>editor.chain().focus().setParagraph().run())}
            {([2,3,4] as const).map(level=><button type="button" key={level} disabled={!editable} aria-pressed={editor.isActive("heading",{level})} onClick={()=>editor.chain().focus().toggleHeading({level}).run()}>H{level}</button>)}
            {button("پررنگ",()=>editor.chain().focus().toggleBold().run(),editor.isActive("bold"))}
            {button("مورب",()=>editor.chain().focus().toggleItalic().run(),editor.isActive("italic"))}
            {button("زیرخط",()=>editor.chain().focus().toggleUnderline().run(),editor.isActive("underline"))}
            {button("فهرست",()=>editor.chain().focus().toggleBulletList().run())}
            {button("شماره‌دار",()=>editor.chain().focus().toggleOrderedList().run())}
            {button("نقل‌قول",()=>editor.chain().focus().toggleBlockquote().run())}
            {button("جدول",()=>editor.chain().focus().insertTable({rows:3,cols:3,withHeaderRow:true}).run())}
            {editor.isActive("table")&&<>{button("سطر +",()=>editor.chain().focus().addRowAfter().run())}{button("ستون +",()=>editor.chain().focus().addColumnAfter().run())}{button("حذف جدول",()=>editor.chain().focus().deleteTable().run())}</>}
            {button("بازگشت",()=>editor.chain().focus().undo().run())}{button("دوباره",()=>editor.chain().focus().redo().run())}
            <button type="button" onClick={()=>setSource(!source)} aria-pressed={source}>{source?"نمایش دیداری":"ویرایش HTML"}</button>
        </div>
        {!source&&<div className="editor-insert">
            <label>نشانی پیوند<input dir="ltr" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://… یا /articles/…" disabled={!editable}/></label>
            {button("درج پیوند",()=>{if(/^(https:\/\/|\/(?!\/)|#)/.test(link)&&!/[\s\\]/.test(link)){editor.chain().focus().extendMarkRange("link").setLink({href:link}).run();setLinkError("");}else setLinkError("نشانی پیوند باید HTTPS یا مسیر داخلی معتبر باشد.");})}
            {button("حذف پیوند",()=>editor.chain().focus().unsetLink().run())}
            {linkError&&<p role="alert">{linkError}</p>}
            {canUseMedia&&<><MediaPicker token={token} label="تصویر کتابخانه" value={selected?.key??""} disabled={!editable} onSelect={setSelected}/>
            {button("درج تصویر",()=>{if(selected)editor.chain().focus().setImage({src:selected.url,alt:selected.alt}).run();})}</>}
        </div>}
        {source?<><textarea className="html-source" aria-label="کد HTML مقاله" dir="ltr" value={html} onChange={e=>onChange(e.target.value)} readOnly={!editable}/><p className="editor-help">کد HTML در سرور و پیش‌نمایش پاک‌سازی می‌شود؛ اسکریپت، iframe، استایل دلخواه و تصویر خارج از کتابخانه مجاز نیست.</p></>:<EditorContent editor={editor} className="article-body"/>}
    </section>;
}
