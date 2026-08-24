/* Healthy Eating Companion — Conditional Branching & Match Validation 0.6.32
   Pure candidate-compatibility logic used by the universal guided search.
   The engine never keeps an incompatible nutrition record merely to finish a flow.
*/
(function(global){
  'use strict';

  const VERSION='0.6.33';
  const S=global.HECSearchFoundation;
  const IGNORE=/not sure|typical|other/i;
  const WORD_EQUIV={
    lamb:['lamb','mutton'],
    mutton:['mutton','lamb'],
    savoury:['savoury','savory'],
    savory:['savory','savoury'],
    yoghurt:['yoghurt','yogurt'],
    yogurt:['yogurt','yoghurt']
  };

  function norm(v){return S?.norm?S.norm(v):String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
  function features(food,concept){return S?.descriptorFeatures?S.descriptorFeatures(food?.name||'',concept)||{}:{};}
  function meaningful(v){return !!v&&!IGNORE.test(String(v));}
  function phrases(v){return String(v||'').split('/').map(norm).filter(Boolean);}
  function tokenAlternatives(token){return WORD_EQUIV[token]||[token];}
  function phraseInHay(phrase,hay){
    const ts=norm(phrase).split(' ').filter(Boolean).filter(t=>!['and','or','style','option','ready','to','eat'].includes(t));
    if(!ts.length)return false;
    return ts.every(t=>tokenAlternatives(t).some(a=>(` ${hay} `).includes(` ${a} `)));
  }
  function compatibleText(actual,wanted){
    const a=norm(actual),w=norm(wanted);if(!a||!w)return false;
    if(a===w||a.includes(w)||w.includes(a))return true;
    const ap=phrases(actual),wp=phrases(wanted);
    return wp.some(x=>ap.some(y=>x===y||x.includes(y)||y.includes(x)));
  }

  function evidence(food,facet,value,concept){
    if(!meaningful(value))return {status:'ignored',facet,value,actual:''};
    const f=features(food,concept),actual=f[facet]||'';
    if(actual){
      if(compatibleText(actual,value))return {status:'match',facet,value,actual,reason:'record facet'};
      // A generic "Cooked" nutrition reference can safely support a more specific
      // dry-heat/water cooking description when the method does not itself imply a
      // different ingredient or added fat. Exact method records still score higher.
      if(facet==='prep'&&((/\bcooked\b/i.test(String(actual))&&/grilled|baked|oven|roasted|air fried|barbecued|bbq|steamed|boiled|microwaved|poached/i.test(String(value)))||(/air fried/i.test(String(value))&&/baked|oven|roasted|grilled|barbecued|bbq/i.test(String(actual))))){
        return {status:'soft',facet,value,actual,reason:'closest compatible cooked reference'};
      }
      return {status:'conflict',facet,value,actual,reason:'record facet differs'};
    }
    const hay=norm(`${food?.name||''} ${food?.ingredients||food?.description||''}`);
    if(phrases(value).some(p=>phraseInHay(p,hay)))return {status:'match',facet,value,actual:'',reason:'record description'};
    // Physical size is an entry/serving attribute and is often absent from a
    // per-100-g nutrition reference. It can safely continue without pretending
    // the source explicitly stated it. "No added fat/oil" is likewise a safe
    // soft qualifier when the preparation itself does not add fat.
    if(facet==='size'||facet==='species'||(facet==='addedFat'&&/no added/i.test(String(value))))return {status:'soft',facet,value,actual:'',reason:'entry attribute not encoded in source'};
    return {status:'unknown',facet,value,actual:'',reason:'not supported by record'};
  }

  function validate(food,state,concept){
    const checks=[];
    for(const [facet,value] of Object.entries(state||{})){
      if(!meaningful(value))continue;
      checks.push(evidence(food,facet,value,concept));
    }
    const issues=checks.filter(x=>x.status==='conflict'||x.status==='unknown');
    return {valid:issues.length===0,checks,issues,matched:checks.filter(x=>x.status==='match').length};
  }

  function filter(candidates,state,concept){
    return (candidates||[]).filter(food=>validate(food,state,concept).valid);
  }

  function choiceValues(facet,candidates,concept){
    const out=[];
    for(const food of candidates||[]){
      const v=features(food,concept)[facet];
      if(!meaningful(v))continue;
      if(!out.some(x=>norm(x)===norm(v)))out.push(v);
    }
    for(const v of concept?.supplemental?.[facet]||[]){if(!meaningful(v))continue;if(!out.some(x=>norm(x)===norm(v)))out.push(v);}
    return out;
  }

  function facetStats(facet,candidates,concept){
    const list=candidates||[],values=choiceValues(facet,list,concept);
    let explicit=0;for(const food of list)if(meaningful(features(food,concept)[facet]))explicit++;
    return {values,explicit,total:list.length,universal:!!list.length&&explicit===list.length&&values.length===1};
  }

  const SINGLE_CHOICE_PROMPT_FACETS=new Set(['filling','protein','variety','type','cut','flavour']);
  function stateAlreadyImplies(value,state){
    const hay=norm(Object.values(state||{}).filter(meaningful).join(' '));
    if(!hay)return false;
    return phrases(value).some(p=>phraseInHay(p,hay));
  }

  function nextFacet(candidates,state,concept,facetOrder){
    const current=filter(candidates,state,concept);
    if(!current.length)return {error:'no-compatible-candidates',candidates:[]};
    const auto=[];
    for(const facet of facetOrder||[]){
      if(state?.[facet])continue;
      const stats=facetStats(facet,current,concept);
      if(stats.values.length>=2)return {facet,choices:stats.values,candidates:current,auto};
      if(stats.universal){
        const only=stats.values[0];
        // When a single remaining value is still a meaningful identity choice,
        // show it rather than silently assuming it. This makes branches visibly
        // different (for example Sweet Pie -> Apple) without adding redundant
        // questions that are already implied by an earlier answer.
        if(SINGLE_CHOICE_PROMPT_FACETS.has(facet)&&!stateAlreadyImplies(only,state))return {facet,choices:[only],candidates:current,auto};
        auto.push({facet,value:only});continue;
      }
      // One explicit value mixed with unspecified records is not a meaningful
      // question: asking it would imply precision the source does not support.
    }
    return {facet:'',choices:[],candidates:current,auto};
  }


  function queryIntentIssues(food,state,concept,query){
    if(!S?.parseQuery)return [];
    const parsed=S.parseQuery(query||''),foodText=parsed.food||'';
    const aliases=(concept?.aliases||[]).map(a=>S.singular?S.singular(a):norm(a)).sort((a,b)=>b.length-a.length);
    const alias=aliases.find(a=>(` ${foodText} `).includes(` ${a} `))||'';
    const aliasTokens=new Set(alias.split(' ').filter(Boolean));
    const selectedHay=norm(Object.values(state||{}).filter(meaningful).join(' '));
    const sourceHay=norm(`${food?.name||''} ${food?.ingredients||food?.description||''}`);
    const stop=new Set(['and','or','with','without','on','style','food','bought','commercial','packaged','homemade','home','strip','strips','piece','pieces','chunk','chunks','diced','sliced','fillet','fillets']);
    const residual=foodText.split(' ').filter(Boolean).filter(t=>!aliasTokens.has(t)&&!stop.has(t));
    const issues=[];
    for(const token of residual){
      const coveredBySelection=tokenAlternatives(token).some(a=>(` ${selectedHay} `).includes(` ${a} `));
      const coveredBySource=tokenAlternatives(token).some(a=>(` ${sourceHay} `).includes(` ${a} `));
      if(!coveredBySelection&&!coveredBySource)issues.push({status:'unknown',facet:'query',value:token,actual:'',reason:'typed word is not supported by selected path or nutrition record'});
    }
    return issues;
  }

  function validateWithQuery(food,state,concept,query){
    const base=validate(food,state,concept),queryIssues=queryIntentIssues(food,state,concept,query),issues=[...base.issues,...queryIssues];
    return {valid:issues.length===0,checks:base.checks,issues,matched:base.matched,queryIssues};
  }

  function describeIssues(issues){
    return (issues||[]).map(i=>`${i.facet}: selected “${i.value}”${i.actual?`, record says “${i.actual}”`:' is not supported by the nutrition record'}`);
  }

  global.HECGuidedBranching={version:VERSION,features,evidence,validate,validateWithQuery,queryIntentIssues,filter,choiceValues,facetStats,nextFacet,describeIssues};
})(typeof window!=='undefined'?window:globalThis);
