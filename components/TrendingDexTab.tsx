"use client";

import { useEffect, useState, useRef } from "react";
import DexCard from "./DexCard";

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

type Period = "m5"|"h1"|"h6"|"h24"|"d3"|"d7";
type Mode   = "gainers"|"volume"|"txns"|"newest";

const PERIODS  = [{key:"m5",label:"M5"},{key:"h1",label:"H1"},{key:"h6",label:"H6"},{key:"h24",label:"24H"}];
const NEWEST_P = [{key:"h1",label:"1H"},{key:"h6",label:"H6"},{key:"h24",label:"H24"},{key:"d3",label:"D3"},{key:"d7",label:"7D"}];
const MODES: {key:Mode;label:string;icon:string}[] = [
  {key:"gainers",label:"Gainers",icon:"▲"},
  {key:"volume", label:"Volume", icon:"V"},
  {key:"txns",   label:"Txns",   icon:"T"},
  {key:"newest", label:"Newest", icon:"N"},
];

function fmt(n?:number){
  if(n==null)return "—";
  if(n>=1_000_000)return "$"+(n/1_000_000).toFixed(2)+"M";
  if(n>=1_000)return "$"+(n/1_000).toFixed(1)+"K";
  return "$"+n.toFixed(2);
}
function fmtNum(n?:number){
  if(n==null)return "—";
  if(n>=1_000_000)return (n/1_000_000).toFixed(1)+"M";
  if(n>=1_000)return (n/1_000).toFixed(1)+"K";
  return String(n);
}
function fmtPrice(s?:string){
  const n=parseFloat(s||"0");
  if(!n)return "—";
  if(n>=1)return "$"+n.toFixed(2);
  if(n>=0.01)return "$"+n.toFixed(4);
  if(n>=0.0001)return "$"+n.toFixed(6);
  return "$"+n.toFixed(8);
}

export default function TrendingDexTab({onSelect, dark=false}:{onSelect:(p:any)=>void;dark?:boolean}){
  const bg     = dark ? "#1e1e1c" : "#ffffff";
  const bg2    = dark ? "#2a2a28" : "#F1EFE8";
  const border = dark ? "#3a3a38" : "#D3D1C7";
  const text   = dark ? "#e8e6df" : "#2c2c2a";
  const text2  = dark ? "#9c9a92" : "#888780";
  const text3  = dark ? "#6a6a68" : "#B4B2A9";
  const blue   = dark ? "#5ba3e8" : "#185FA5";
  const blueBg = dark ? "#0f2035" : "#E6F1FB";
  const blueDark = dark ? "#85B7EB" : "#0C447C";
  const green  = dark ? "#7bc96f" : "#3B6D11";
  const red    = dark ? "#f47c7c" : "#A32D2D";

  const [pairs,setPairs]     = useState<any[]>([]);
  const [mode,setMode]       = useState<Mode>("gainers");
  const [period,setPeriod]   = useState<Period>("h24");
  const [loading,setLoading] = useState(true);
  const [total,setTotal]     = useState(0);
  const fetchingRef = useRef(false);

  const doFetch = async(m:Mode,p:string)=>{
    if(fetchingRef.current)return;
    fetchingRef.current=true;
    setLoading(true);
    try{
      const res=await fetch("/api/dexscreener?type=trending_dex&mode="+m+"&period="+p+"&t="+Date.now());
      const json=await res.json();
      setPairs(json.data||[]);
      setTotal(json.total||0);
    }catch(e){console.error(e);}
    finally{setLoading(false);fetchingRef.current=false;}
  };

  useEffect(()=>{doFetch(mode,period);},[mode,period]);

  const activePeriods=mode==="newest"?NEWEST_P:PERIODS;

  const handleMode=(m:Mode)=>{
    setMode(m);
    if(m==="newest"&&!["h1","h6","h24","d3","d7"].includes(period))setPeriod("h1" as Period);
    if(m!=="newest"&&!["m5","h1","h6","h24"].includes(period))setPeriod("h24" as Period);
  };

  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {MODES.map(m=>(
          <button key={m.key} onClick={()=>handleMode(m.key)} style={{
            padding:"7px 18px",fontSize:13,cursor:"pointer",borderRadius:8,
            border:mode===m.key?`2px solid ${blue}`:`0.5px solid ${border}`,
            background:mode===m.key?blueBg:"transparent",
            color:mode===m.key?blueDark:text2,fontWeight:mode===m.key?500:400,
          }}>{m.icon} {m.label}</button>
        ))}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:16,alignItems:"center"}}>
        <span style={{fontSize:12,color:text2,marginRight:4}}>Period:</span>
        <div style={{display:"flex",border:`0.5px solid ${border}`,borderRadius:8,overflow:"hidden"}}>
          {activePeriods.map(p=>(
            <button key={p.key} onClick={()=>setPeriod(p.key as Period)} style={{
              padding:"5px 14px",fontSize:12,cursor:"pointer",border:"none",
              background:period===p.key?blueBg:"transparent",
              color:period===p.key?blueDark:text2,fontWeight:period===p.key?500:400,
            }}>{p.label}</button>
          ))}
        </div>
        <span style={{fontSize:12,color:text3,marginLeft:8}}>{loading?"Loading...":pairs.length+" pairs"}</span>
        <button onClick={()=>doFetch(mode,period)} disabled={loading} style={{marginLeft:"auto",padding:"5px 12px",fontSize:12,cursor:"pointer",border:`0.5px solid ${border}`,borderRadius:8,background:"transparent",color:text2}}>↻</button>
      </div>

      {loading?(
        <div style={{textAlign:"center",padding:"60px 0",color:text2,fontSize:14}}>Loading...</div>
      ):pairs.length===0?(
        <div style={{textAlign:"center",padding:"60px 0",color:text2,fontSize:14}}>No data for this period. Try a longer time window.</div>
      ):mode==="newest"?(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:14}}>
          {pairs.map((pair:any,i:number)=>(
            <DexCard dark={dark} key={i} pair={pair} onClick={()=>onSelect({...pair,address:pair.baseToken?.address})}/>
          ))}
        </div>
      ):(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:8,padding:"8px 12px",fontSize:11,color:text2,fontWeight:500,borderBottom:"0.5px solid #D3D1C7",marginBottom:4}}>
            <div>TOKEN</div>
            <div style={{textAlign:"right"}}>PRICE</div>
            <div style={{textAlign:"right"}}>{mode==="gainers"?"CHG "+period.toUpperCase():mode==="volume"?"VOL "+period.toUpperCase():"TXNS "+period.toUpperCase()}</div>
            <div style={{textAlign:"right"}}>LIQUIDITY</div>
            <div style={{textAlign:"right"}}>B/S</div>
          </div>
          {pairs.map((pair:any,i:number)=>{
            const chg=pair.priceChange?.[period]??0;
            const vol=pair.volume?.[period]??0;
            const buys=pair.txns?.[period]?.buys??0;
            const sells=pair.txns?.[period]?.sells??0;
            const total=buys+sells||1;
            const buyPct=Math.round((buys/total)*100);
            const symbol=pair.baseToken?.symbol||"???";
            const name=pair.baseToken?.name||"";
            const imageUrl=pair.info?.imageUrl;
            const isBull=chg>=0;
            return (
              <div key={i} onClick={()=>onSelect({...pair,address:pair.baseToken?.address})}
                style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:8,padding:"10px 12px",borderBottom:"0.5px solid #F1EFE8",cursor:"pointer",alignItems:"center"}}
                onMouseEnter={e=>(e.currentTarget.style.background="#F8F8F7")}
                onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
              >
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:12,color:text3,minWidth:20}}>{i+1}</span>
                  {imageUrl?(
                    <img src={imageUrl} width={28} height={28} style={{borderRadius:"50%",flexShrink:0}} onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}}/>
                  ):(
                    <div style={{width:28,height:28,borderRadius:"50%",background:blueBg,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,color:blue}}>
                      {symbol.slice(0,2).toUpperCase()}
                    </div>
                  )}
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,color:text}}>{symbol}</div>
                    <div style={{fontSize:11,color:text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name.slice(0,20)}</div>
                  </div>
                </div>
                <div style={{textAlign:"right",fontSize:12,color:text}}>{fmtPrice(pair.priceUsd)}</div>
                <div style={{textAlign:"right"}}>
                  {mode==="gainers"&&<span style={{fontSize:13,fontWeight:500,color:isBull?"#3B6D11":"#A32D2D"}}>{isBull?"+":""}{Math.abs(chg).toFixed(1)}%</span>}
                  {mode==="volume"&&<span style={{fontSize:13,fontWeight:500,color:text}}>{fmt(vol)}</span>}
                  {mode==="txns"&&<span style={{fontSize:13,fontWeight:500,color:text}}>{fmtNum(buys+sells)}</span>}
                </div>
                <div style={{textAlign:"right",fontSize:12,color:text2}}>{fmt(pair.liquidity?.usd)}</div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:green,marginBottom:2}}>{buyPct}%</div>
                  <div style={{height:4,background:"#FCEBEB",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:buyPct+"%",background:"#639922",borderRadius:4}}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
