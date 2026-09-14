'use strict';
// The ordered application ABI and the small offline startup set. Product shards
// and artwork are deliberately not prerequisites for a complete application.
module.exports={version:'0.6.33',runtime:[
  'installation-config.js','config.js','installation-foundation.js',
  'migrations.js','companions.js','companion-artwork.js','companion-voice-metadata.js','companion-voices.js',
  'stage4-foundation.js','weight-progress-foundation.js','nutrition-trends-foundation.js','app.js',
  'entity-registry.js','search-foundation.js','product-serving-semantics.js','food-sources.js',
  'australian-catalogue-data.js','mcdonalds-au-catalogue-data.js','mcdonalds-au-catalogue.js',
  'kfc-au-catalogue-data.js','kfc-au-supplement-data.js','kfc-au-catalogue.js','food-catalogue.js',
  'retailer-catalogue.js','retailer-source.js','woolworths-au-catalogue.js','off-catalogue.js','coles-au-catalogue.js',
  'guided-branching.js','packaged-foods.js','capture-foundation.js','serving-foundation.js','guided-product-resolution.js',
  'activity-foundation.js','food-groups-foundation.js','conversation-foundation.js','alpha06.js','alpha064.js'
],support:['styles.css','manifest.webmanifest','data/open-food-facts-au/manifest.json','afcd-release-3.json'],
optional:['assets/app-icons/hec-my-data-180.png','assets/app-icons/hec-my-data-192.png','assets/app-icons/hec-my-data-512.png',
  'assets/app-icons/hec-test-180.png','assets/app-icons/hec-test-192.png','assets/app-icons/hec-test-512.png',
  ...['percy-pelican','wally-wombat','anna-goanna','shelly-turtle','ruby-ringneck','bonnie-bilby','skip-kangaroo','rusty-dingo','gary-galah','monty-python','chuckles-kookaburra','ernie-echidna','spike-thorny-devil','cassie-cassowary','salty-crocodile','bushy-koala'].map(name=>'assets/companions/runtime/picker/'+name+'.webp')]
};
