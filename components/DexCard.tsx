"use client";

function timeAgo(ts?: number) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)        return s + "s ago";
  if (s < 3600)      return Math.floor(s/60) + "m ago";
  if (s < 86400)     return Math.floor(s/3600) + "h ago";
  if (s < 86400*30)  return Math.floor(s/86400) + "d ago";
  if (s < 86400*365) return Math.floor(s/86400/30) + "mo ago";
  return Math.floor(s/86400/365) + "y ago";
}

const BADGE: Record<string, {bg:string;color:string;text:string}> = {
  safe:    {bg:"#EAF3DE",color:"#3B6D11",text:"Safe"},
  caution: {bg:"#FAEEDA",color:"#854F0B",text:"Caution"},
  danger:  {bg:"#FCEBEB",color:"#A32D2D",text:"Danger"},
};
const SOCIAL_LABELS: Record<string,string> = {twitter:"X",telegram:"TG",discord:"DC",website:"Web"};

interface DexPair {
  baseToken?: {address:string;symbol:string;name:string};
  quoteToken?: {symbol:string};
  priceUsd?: string;
  priceChange?: {h24?:number;h1?:number};
  volume?: {h24?:number;h1?:number};
  liquidity?: {usd?:number};
  txns?: {h24?:{buys:number;sells:number};h1?:{buys:number;sells:number}};
  fdv?: number;
  pairCreatedAt?: number;
  dexId?: string;
  tokenAddress?: string;
  description?: string;
  score?: number;
  label?: "safe"|"caution"|"danger";
  info?: {imageUrl?:string;socials?:{type:string;url:string}[];websites?:{url:string}[]};
  links?: {type:string;url:string;label?:string}[];
}

function fmt(n?:number){
  if(n==null)return "—";
  if(n>=1_000_000)return "$"+(n/1_000_000).toFixed(2)+"M";
  if(n>=1_000)return "$"+(n/1_000).toFixed(1)+"K";
  return "$"+n.toFixed(2);
}
function fmtPrice(s?:string){
  const n=parseFloat(s||"0");
  if(!n)return "—";
  if(n>=1)return "$"+n.toFixed(2);
  if(n>=0.01)return "$"+n.toFixed(4);
  if(n>=0.0001)return "$"+n.toFixed(6);
  return "$"+n.toFixed(8);
}

export default function DexCard({pair,onClick,starButton}:{pair:DexPair;onClick:()=>void;starButton?:React.ReactNode}){
  const address=pair.baseToken?.address||pair.tokenAddress||"";
  const symbol=pair.baseToken?.symbol||"???";
  const name=pair.baseToken?.name||pair.description||address.slice(0,8)+"...";
  const imageUrl=pair.info?.imageUrl;
  const badge=pair.label?BADGE[pair.label]:null;
  const chg=pair.priceChange?.h24??null;
  const chgColor=chg==null?"#888780":chg>=0?"#3B6D11":"#A32D2D";
  const chgBg=chg==null?"#F1EFE8":chg>=0?"#EAF3DE":"#FCEBEB";
  const buys=pair.txns?.h24?.buys??0;
  const sells=pair.txns?.h24?.sells??0;
  const isBuy=buys>=sells;
  const total=buys+sells||1;
  const buyPct=Math.round((buys/total)*100);
  const volDisplay=(pair.volume?.h1??0)>0?(pair.volume?.h1??0):(pair.volume?.h24??0);
  const socials=[...(pair.info?.socials||[]),...(pair.links||[]).map(l=>({type:l.type||l.label||"link",url:l.url}))].filter((s,i,arr)=>arr.findIndex(x=>x.url===s.url)===i).slice(0,5);
  const websites=pair.info?.websites||[];
  const createdAt=pair.pairCreatedAt?new Date(pair.pairCreatedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})+" "+new Date(pair.pairCreatedAt).toLocaleTimeString("en-GB"):null;

  const handleShare=(e:React.MouseEvent)=>{
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin+"/token/"+address);
    const btn=e.currentTarget as HTMLButtonElement;
    btn.textContent="Copied!";btn.style.color="#3B6D11";
    setTimeout(()=>{btn.textContent="Share";btn.style.color="#888780";},1500);
  };

  return (
    <div onClick={onClick}
      className="card"
      style={{background:"#ffffff",border:"0.5px solid #D3D1C7",borderRadius:12,padding:"16px 18px",display:"flex",flexDirection:"column",gap:10,cursor:"pointer",transition:"border-color 0.15s"}}
      onMouseEnter={e=>(e.currentTarget.style.borderColor="#185FA5")}
      onMouseLeave={e=>(e.currentTarget.style.borderColor="#D3D1C7")}
    >
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div style={{width:28,height:28,borderRadius:6,background:isBuy?"#EAF3DE":"#FCEBEB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:isBuy?"#3B6D11":"#A32D2D",flexShrink:0,marginTop:2}}>
          {isBuy?"↗":"↙"}
        </div>
        {imageUrl?(
          <img src={imageUrl} width={36} height={36} style={{borderRadius:"50%",objectFit:"cover",border:"0.5px solid #D3D1C7",flexShrink:0}}
            onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}}/>
        ):(
          <div style={{width:36,height:36,borderRadius:"50%",background:"#E6F1FB",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:"#185FA5"}}>
            {symbol.slice(0,2).toUpperCase()}
          </div>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontWeight:500,fontSize:14,color:"#2c2c2a"}}>{symbol}</span>
            {pair.quoteToken?.symbol&&<span style={{color:"#B4B2A9",fontSize:12}}>/ {pair.quoteToken.symbol}</span>}
            {chg!=null&&Math.abs(chg)>0.01&&<span style={{background:chgBg,color:chgColor,fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:20}}>{chg>=0?"+":""}{Math.abs(chg).toFixed(1)}%</span>}
            {badge&&<span style={{background:badge.bg,color:badge.color,fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:20}}>{badge.text}</span>}
            {starButton&&<span style={{marginLeft:"auto"}}>{starButton}</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:"#888780",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{name}</span>
            {pair.dexId&&<span style={{fontSize:10,color:"#B4B2A9",background:"#F1EFE8",padding:"2px 7px",borderRadius:10,flexShrink:0}}>{pair.dexId}</span>}
          </div>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:17,fontWeight:500,color:"#2c2c2a"}}>{fmtPrice(pair.priceUsd)}</div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
          {volDisplay>100&&<span style={{fontSize:13,fontWeight:500,color:isBuy?"#3B6D11":"#A32D2D"}}>{isBuy?"+":"-"}{fmt(volDisplay)}</span>}
          {pair.pairCreatedAt&&<span style={{fontSize:11,color:"#B4B2A9"}}>{timeAgo(pair.pairCreatedAt)}</span>}
        </div>
      </div>

      {pair.score!=null&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#888780",marginBottom:4}}>
            <span>Risk score</span><span style={{fontWeight:500,color:"#2c2c2a"}}>{pair.score}/100</span>
          </div>
          <div style={{height:5,background:"#F1EFE8",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:pair.score+"%",borderRadius:4,background:pair.label==="safe"?"#639922":pair.label==="caution"?"#BA7517":"#E24B4A"}}/>
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[{label:"Liquidity",value:fmt(pair.liquidity?.usd)},{label:"FDV",value:fmt(pair.fdv)},{label:"Txns 24h",value:buys+sells>0?(buys+sells).toLocaleString():"—"}].map(({label,value})=>(
          <div key={label} className="stat-box" style={{background:"#F1EFE8",borderRadius:8,padding:"8px 10px"}}>
            <div style={{fontSize:11,color:"#888780"}}>{label}</div>
            <div style={{fontSize:12,fontWeight:500,color:"#2c2c2a",marginTop:2}}>{value}</div>
          </div>
        ))}
      </div>

      {buys+sells>0&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
            <span style={{color:"#3B6D11"}}>Buy {buys.toLocaleString()}</span>
            <span style={{color:"#A32D2D"}}>Sell {sells.toLocaleString()}</span>
          </div>
          <div style={{height:4,background:"#FCEBEB",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:buyPct+"%",background:"#639922",borderRadius:4}}/>
          </div>
        </div>
      )}

      {createdAt&&<div style={{fontSize:11,color:"#888780"}}>Created: <span style={{color:"#2c2c2a",fontWeight:500}}>{createdAt}</span></div>}

      {(socials.length>0||websites.length>0)&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {socials.map((s:any,i:number)=>(
            <a key={i} href={s.url} target="_blank" onClick={e=>e.stopPropagation()}
              style={{fontSize:11,fontWeight:500,padding:"2px 10px",borderRadius:20,background:"#E6F1FB",color:"#185FA5",textDecoration:"none"}}>
              {SOCIAL_LABELS[s.type?.toLowerCase()]||s.type}
            </a>
          ))}
          {websites[0]&&<a href={websites[0].url} target="_blank" onClick={e=>e.stopPropagation()} style={{fontSize:11,fontWeight:500,padding:"2px 10px",borderRadius:20,background:"#E6F1FB",color:"#185FA5",textDecoration:"none"}}>Web</a>}
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
        <div style={{fontSize:11,color:"#B4B2A9",fontFamily:"monospace",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{address?address.slice(0,8)+"..."+address.slice(-6):"—"}</div>
        <button onClick={(e)=>{
          e.stopPropagation();
          navigator.clipboard.writeText(address);
          const btn=e.currentTarget as HTMLButtonElement;
          btn.textContent="Copied!";btn.style.color="#3B6D11";btn.style.borderColor="#3B6D11";
          setTimeout(()=>{btn.textContent="Copy";btn.style.color="#888780";btn.style.borderColor="#D3D1C7";},1500);
        }} style={{fontSize:11,color:"#888780",background:"transparent",border:"0.5px solid #D3D1C7",borderRadius:6,padding:"3px 8px",cursor:"pointer",flexShrink:0}}>Copy</button>
        <button onClick={handleShare} style={{fontSize:11,color:"#888780",background:"transparent",border:"0.5px solid #D3D1C7",borderRadius:6,padding:"3px 8px",cursor:"pointer",flexShrink:0}}>Share</button>
      </div>
    </div>
  );
}
