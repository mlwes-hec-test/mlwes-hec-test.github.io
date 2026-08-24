(function(global){
  "use strict";

  const ROOT="assets/companions/runtime";
  const ROSTER=Object.freeze([
    "percy-pelican","wally-wombat","anna-goanna","shelly-turtle",
    "ruby-ringneck","bonnie-bilby","skip-kangaroo","rusty-dingo",
    "gary-galah","monty-python","chuckles-kookaburra","ernie-echidna",
    "spike-thorny-devil","cassie-cassowary","salty-crocodile","bushy-koala"
  ]);

  const entry=id=>Object.freeze({
    hero:Object.freeze({
      src:`${ROOT}/hero/512/${id}.webp`,
      srcset:`${ROOT}/hero/512/${id}.webp 1x, ${ROOT}/hero/1024/${id}.webp 2x`
    }),
    picker:Object.freeze({src:`${ROOT}/picker/${id}.webp`})
  });

  const ARTWORK=Object.freeze(Object.fromEntries(ROSTER.map(id=>[id,entry(id)])));

  function companionArtwork(id,variant){
    const artwork=ARTWORK[String(id||"")];
    return artwork?.[variant]?.src||null;
  }

  function companionArtworkSrcSet(id,variant){
    const artwork=ARTWORK[String(id||"")];
    return artwork?.[variant]?.srcset||null;
  }

  global.HEC_COMPANION_ARTWORK_ROSTER=ROSTER;
  global.HEC_COMPANION_ARTWORK=ARTWORK;
  global.companionArtwork=companionArtwork;
  global.companionArtworkSrcSet=companionArtworkSrcSet;
})(window);
