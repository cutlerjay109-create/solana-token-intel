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

const SOCIAL_LABELS: Record<string,string> = {twitter:"X",telegram:"TG",discord:"DC",website:"Web"};

export default function DexCard({pair,onClick,starButton,dark=false}:{pair:DexPair;onClick:()=>void;starButton?:React.ReactNode;dark?:boolean}){
  // ── theme colors ──
  const bg       = dark ? "#1e1e1c" : "#ffffff";
  const bg2      = dark ? "#2a2a28" : "#F1EFE8";
  const border   = dark ? "#3a3a38" : "#D3D1C7";
  const text     = dark ? "#e8e6df" : "#2c2c2a";
  const text2    = dark ? "#9c9a92" : "#888780";
  const text3    = dark ? "#6a6a68" : "#B4B2A9";
  const blue     = dark ? "#5ba3e8" : "#185FA5";
  const blueBg   = dark ? "#0f2035" : "#E6F1FB";
  const green    = dark ? "#7bc96f" : "#3B6D11";
  const greenBg  = dark ? "#1a2e14" : "#EAF3DE";
  const amber    = dark ? "#e8a44a" : "#854F0B";
  const amberBg  = dark ? "#2e2210" : "#FAEEDA";
  const red      = dark ? "#f47c7c" : "#A32D2D";
  const redBg    = dark ? "#2e1414" : "#FCEBEB";

  const address  = pair.baseToken?.address||pair.tokenAddress||"";
  const symbol   = pair.baseToken?.symbol||"???";
  const name     = pair.baseToken?.name||pair.description||address.slice(0,8)+"...";
  const imageUrl = pair.info?.imageUrl;

  const BADGE = {
    safe:    {bg:greenBg, color:green, text:"Safe"},
    caution: {bg:amberBg, color:amber, text:"Caution"},
    danger:  {bg:redBg,   color:red,   text:"Danger"},
  };
  const badge = pair.label ? BADGE[pair.label] : null;

  const chg      = pair.priceChange?.h24??null;
  const chgColor = chg==null?text2:chg>=0?green:red;
  const chgBg    = chg==null?bg2:chg>=0?greenBg:redBg;
  const buys     = pair.txns?.h24?.buys??0;
  const sells    = pair.txns?.h24?.sells??0;
  const isBuy    = buys>=sells;
  const total    = buys+sells||1;
  const buyPct   = Math.round((buys/total)*100);
  const volDisplay=(pair.volume?.h1??0)>0?(pair.volume?.h1??0):(pair.volume?.h24??0);
  const socials  = [...(pair.info?.socials||[]),...(pair.links||[]).map((l:any)=>({type:l.type||l.label||"link",url:l.url}))].filter((s:any,i:number,arr:any[])=>arr.findIndex((x:any)=>x.url===s.url)===i).slice(0,5);
  const websites = pair.info?.websites||[];
  const createdAt= pair.pairCreatedAt
    ? new Date(pair.pairCreatedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})
      +" "+new Date(pair.pairCreatedAt).toLocaleTimeString("en-GB")
    : null;

  const handleShare=(e:React.MouseEvent)=>{
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin+"/token/"+address);
    const btn=e.currentTarget as HTMLButtonElement;
    btn.textContent="Copied!";btn.style.color=green;
    setTimeout(()=>{btn.textContent="Share";btn.style.color=text2;},1500);
  };

  return (
    <div onClick={onClick} style={{
      background:bg, border:`0.5px solid ${border}`, borderRadius:12,
      padding:"16px 18px", display:"flex", flexDirection:"column", gap:10,
      cursor:"pointer", transition:"border-color 0.15s",
    }}
      onMouseEnter={e=>(e.currentTarget.style.borderColor=blue)}
      onMouseLeave={e=>(e.currentTarget.style.borderColor=border)}
    >
      {/* Header row */}
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div style={{width:28,height:28,borderRadius:6,background:isBuy?greenBg:redBg,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:14,color:isBuy?green:red,flexShrink:0,marginTop:2}}>
          {isBuy?"↗":"↙"}
        </div>
        {imageUrl?(
          <img src={imageUrl} width={36} height={36}
            style={{borderRadius:"50%",objectFit:"cover",border:`0.5px solid ${border}`,flexShrink:0}}
            onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}}/>
        ):(
          <div style={{width:36,height:36,borderRadius:"50%",background:blueBg,flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:blue}}>
            {symbol.slice(0,2).toUpperCase()}
          </div>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontWeight:500,fontSize:14,color:text}}>{symbol}</span>
            {pair.quoteToken?.symbol&&<span style={{color:text3,fontSize:12}}>/ {pair.quoteToken.symbol}</span>}
            {chg!=null&&Math.abs(chg)>0.01&&
              <span style={{background:chgBg,color:chgColor,fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:20}}>
                {chg>=0?"+":""}{Math.abs(chg).toFixed(1)}%
              </span>}
            {badge&&
              <span style={{background:badge.bg,color:badge.color,fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:20}}>
                {badge.text}
              </span>}
            {starButton&&<span style={{marginLeft:"auto"}}>{starButton}</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{name}</span>
            {pair.dexId&&<span style={{fontSize:10,color:text3,background:bg2,padding:"2px 7px",borderRadius:10,flexShrink:0}}>{pair.dexId}</span>}
          </div>
        </div>
      </div>

      {/* Price + volume */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{fontSize:17,fontWeight:500,color:text}}>{fmtPrice(pair.priceUsd)}</div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
          {volDisplay>100&&<span style={{fontSize:13,fontWeight:500,color:isBuy?green:red}}>{isBuy?"+":"-"}{fmt(volDisplay)}</span>}
          {pair.pairCreatedAt&&<span style={{fontSize:11,color:text3}}>{timeAgo(pair.pairCreatedAt)}</span>}
        </div>
      </div>

      {/* Risk score */}
      {pair.score!=null&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:text2,marginBottom:4}}>
            <span>Risk score</span>
            <span style={{fontWeight:500,color:text}}>{pair.score}/100</span>
          </div>
          <div style={{height:5,background:dark?"#3a3a38":"#F1EFE8",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:pair.score+"%",borderRadius:4,
              background:pair.label==="safe"?green:pair.label==="caution"?amber:red}}/>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[
          {label:"Liquidity", value:fmt(pair.liquidity?.usd)},
          {label:"FDV",       value:fmt(pair.fdv)},
          {label:"Txns 24h",  value:buys+sells>0?(buys+sells).toLocaleString():"—"},
        ].map(({label,value})=>(
          <div key={label} style={{background:bg2,borderRadius:8,padding:"8px 10px"}}>
            <div style={{fontSize:11,color:text2}}>{label}</div>
            <div style={{fontSize:12,fontWeight:500,color:text,marginTop:2}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Buy/sell bar */}
      {buys+sells>0&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
            <span style={{color:green}}>Buy {buys.toLocaleString()}</span>
            <span style={{color:red}}>Sell {sells.toLocaleString()}</span>
          </div>
          <div style={{height:5,background:dark?"#5c2020":"#F5C2C2",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:buyPct+"%",background:green,borderRadius:4}}/>
          </div>
        </div>
      )}

      {/* Created */}
      {createdAt&&(
        <div style={{fontSize:11,color:text2}}>
          Created: <span style={{color:text,fontWeight:500}}>{createdAt}</span>
        </div>
      )}

      {/* Socials */}
      {(socials.length>0||websites.length>0)&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {socials.map((s:any,i:number)=>(
            <a key={i} href={s.url} target="_blank" onClick={e=>e.stopPropagation()}
              style={{fontSize:11,fontWeight:500,padding:"2px 10px",borderRadius:20,
                background:blueBg,color:blue,textDecoration:"none"}}>
              {SOCIAL_LABELS[s.type?.toLowerCase()]||s.type}
            </a>
          ))}
          {websites[0]&&(
            <a href={websites[0].url} target="_blank" onClick={e=>e.stopPropagation()}
              style={{fontSize:11,fontWeight:500,padding:"2px 10px",borderRadius:20,
                background:blueBg,color:blue,textDecoration:"none"}}>Web</a>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:4}}>
        <div style={{fontSize:11,color:text3,fontFamily:"monospace",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {address?address.slice(0,8)+"..."+address.slice(-6):"—"}
        </div>
        <div style={{display:"flex",gap:4,flexShrink:0}}>
          <button onClick={(e)=>{
            e.stopPropagation();
            navigator.clipboard.writeText(address);
            const btn=e.currentTarget as HTMLButtonElement;
            btn.textContent="Copied!";btn.style.color=green;btn.style.borderColor=green;
            setTimeout(()=>{btn.textContent="Copy";btn.style.color=text2;btn.style.borderColor=border;},1500);
          }} style={{fontSize:11,color:text2,background:"transparent",border:`0.5px solid ${border}`,borderRadius:6,padding:"3px 8px",cursor:"pointer"}}>Copy</button>
          <button onClick={handleShare}
            style={{fontSize:11,color:text2,background:"transparent",border:`0.5px solid ${border}`,borderRadius:6,padding:"3px 8px",cursor:"pointer"}}>Share</button>
        </div>
      </div>
    </div>
  );
}
