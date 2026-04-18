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

export default function WhaleTab({pairs,onSelect,filter}:{pairs:any[];onSelect:(p:any)=>void;filter:string}){
  if(!pairs.length)return <div style={{textAlign:"center",padding:"60px 0",color:"#888780",fontSize:14}}>No whale data available.</div>;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      {pairs.map((pair:any,i:number)=>{
        const buys=pair.txns?.h24?.buys??0;
        const sells=pair.txns?.h24?.sells??0;
        const isBuy=buys>=sells;
        const chg=pair.priceChange?.h24??0;
        const symbol=pair.baseToken?.symbol||"???";
        const imageUrl=pair.info?.imageUrl;
        return (
          <div key={i} onClick={()=>onSelect({...pair,address:pair.baseToken?.address})}
            style={{display:"flex",alignItems:"center",gap:12,padding:"12px 4px",borderBottom:"0.5px solid #F1EFE8",cursor:"pointer"}}
            className="row-hover"
            onMouseEnter={e=>(e.currentTarget.style.background="#F8F8F7")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
          >
            <div style={{width:32,height:32,borderRadius:8,flexShrink:0,background:isBuy?"#EAF3DE":"#FCEBEB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:isBuy?"#3B6D11":"#A32D2D"}}>
              {isBuy?"↗":"↙"}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
              {imageUrl?(
                <img src={imageUrl} width={28} height={28} style={{borderRadius:"50%",flexShrink:0}} onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}}/>
              ):(
                <div style={{width:28,height:28,borderRadius:"50%",background:"#E6F1FB",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,color:"#185FA5"}}>
                  {symbol.slice(0,2).toUpperCase()}
                </div>
              )}
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:"#2c2c2a"}}>
                  <span style={{color:isBuy?"#3B6D11":"#A32D2D",marginRight:6}}>{isBuy?"BUY":"SELL"}</span>{symbol}
                </div>
                <div style={{fontSize:11,color:"#888780",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {pair.baseToken?.address?.slice(0,6)}...{pair.baseToken?.address?.slice(-4)} · {pair.dexId}
                </div>
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:13,fontWeight:500,color:"#2c2c2a"}}>{fmt(pair.volume?.h24)}</div>
              <div style={{fontSize:11,color:chg>=0?"#3B6D11":"#A32D2D"}}>{chg>=0?"+":""}{chg.toFixed(1)}%</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0,minWidth:80}}>
              <div style={{fontSize:12,fontWeight:500,color:"#2c2c2a"}}>{fmtPrice(pair.priceUsd)}</div>
              <div style={{fontSize:11,color:"#B4B2A9"}}>{timeAgo(pair.pairCreatedAt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
