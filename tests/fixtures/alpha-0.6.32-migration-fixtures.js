"use strict";

const FIXTURE_TIME = "2026-08-18T08:30:00.000Z";

function freshUser(){
  return {
    main:{version:"0.6.32",completed:false,personal:{surname:""},preferences:{theme:"garden"}},
    ext:{version:"0.6.32"}
  };
}

function establishedUser(){
  return {
    main:{
      version:"0.6.32",
      email:"founder@example.test",
      completed:true,
      profileStartedDate:"2026-08-01",
      personal:{givenName:"Alex",surname:"Founder",preferredName:"Al",preferredPronunciation:"Ahl",dob:"1980-05-10"},
      preferences:{theme:"coast",language:"en-AU",inspirationIndex:4},
      health:{exerciseCredit:50,currentWeightKg:81.5},
      companion:{
        enabled:true,configured:true,id:"rowdy-ringneck",name:"Rowdy",characterName:"Rowdy the Ringneck Parrot",character:"🦜",
        customName:"Roo",pronunciation:"Roo-dee",voice:"Karen",speechEnabled:true,personality:"energetic"
      },
      weightHistory:[
        {date:"2026-08-01",weightKg:83,note:"Starting Weight",recordedAt:"2026-08-01T07:00:00.000Z",isStartingWeight:true},
        {id:"weight-existing",date:"2026-08-18",weightKg:81.5,note:"Progress Check-In",recordedAt:FIXTURE_TIME,createdAt:FIXTURE_TIME}
      ]
    },
    ext:{
      version:"0.6.32",
      diary:{
        "2026-08-17":[
          {foodId:"egg",name:"Egg",date:"2026-08-17",meal:"Breakfast",amount:2,unit:"item",nutrients:{calories:144}},
          {id:"entry-existing",foodId:"apple",name:"Apple",date:"2026-08-17",meal:"Snacks",amount:1,unit:"item",createdAt:"2026-08-17T03:00:00.000Z",nutrients:{calories:80}}
        ]
      },
      exercise:[{date:"2026-08-17T06:00:00.000Z",localDate:"2026-08-17",name:"Walking",minutes:45,calories:300,credit:150,notes:"Morning walk"}],
      shopping:[{item:"Milk",quantity:"2 L",category:"Dairy & Eggs",done:false}],
      customFoods:[{name:"Family Soup",source:"User Created",serving:"1 bowl",nutrients:{calories:240}}],
      onlineFoods:[
        {id:"online-existing",name:"Saved Yoghurt",barcode:"930000000001",savedAt:"2026-08-10T01:00:00.000Z",nutrients:{calories:120}},
        {name:"Saved Cereal",barcode:"930000000002",nutrients:{calories:155}}
      ],
      savedFoodIds:["online-existing"],
      foodVerification:{"online-existing":{method:"barcode-online",savedAt:"2026-08-10T01:00:00.000Z"}},
      recipes:[{name:"Vegetable Bake",servings:4,ingredients:[],perServe:{calories:310},createdAt:"2026-08-12T09:00:00.000Z"}],
      mealTemplates:[{name:"Workday Breakfast",items:[],createdAt:"2026-08-13T09:00:00.000Z"}],
      daySettings:{"2026-08-17":{type:"normal",targetCal:2100}},
      water:{"2026-08-17":1500},
      ui:{diaryDate:"2026-08-17",libraryTab:"saved"}
    }
  };
}

function companionUser(id,name,overrides={}){
  return {
    main:{
      version:"0.6.32",
      completed:true,
      personal:{givenName:"Companion",surname:"Tester"},
      preferences:{theme:"outback"},
      companion:{
        enabled:true,configured:true,id,name,characterName:`${name} legacy companion`,character:"★",customName:"Mate",
        pronunciation:"Mayt",voice:"Exact Device Voice",speechEnabled:false,personality:"legacy",...overrides
      }
    },
    ext:{version:"0.6.32",diary:{},exercise:[],shopping:[],customFoods:[],onlineFoods:[],recipes:[],mealTemplates:[]}
  };
}

function earlierAlphaUser(){
  return {
    main:{
      version:"0.6.16",completed:true,email:"earlier@example.test",
      personal:{givenName:"Earlier",surname:"Tester",activeTimeZone:"Australia/Brisbane"},
      preferences:{theme:"forest",language:"en-AU",inspirationIndex:7},
      health:{exerciseCredit:50,currentWeightKg:88,goal:"lose"},
      companion:{enabled:true,configured:true,id:"koko-koala",name:"Koko",customName:"K",pronunciation:"Kay",voice:"Legacy Exact Voice",voiceStyleId:"gentle-steady",speechEnabled:true},
      weightHistory:[
        {date:"2026-05-01",weightKg:90,note:"Starting Weight",isStartingWeight:true,recordedAt:"2026-05-01T06:00:00.000Z"},
        {date:"2026-05-10",weightKg:89,note:"Progress Check-In",recordedAt:"2026-05-10T06:00:00.000Z"},
        {date:"2026-05-10",weightKg:88.8,note:"Corrected Check-In",recordedAt:"2026-05-10T07:00:00.000Z"}
      ]
    },
    ext:{
      version:"0.6.16",
      diary:{"2026-05-09":[{foodId:"legacy-food",name:"Legacy Lunch",date:"2026-05-09",meal:"Lunch",amount:1,unit:"serve",nutrients:{calories:321,protein:17,carbs:42,fat:9},foodSnapshot:{name:"Legacy Lunch",nutrients:{calories:321,protein:17,carbs:42,fat:9},serving:"1 serve"}}]},
      exercise:[{date:"2026-05-09",name:"Walking",minutes:30,calories:200,credit:100,notes:"Keep historical credit"}],
      shopping:[{item:"Very long legacy shopping item",quantity:"2",category:"Other",done:true}],
      customFoods:[{name:"Family Stew",source:"User Created",serving:"1 bowl",nutrients:{calories:410}}],
      savedFoodIds:["legacy-food"],
      recipes:[{name:"Old Recipe",servings:2,ingredients:[{foodId:"legacy-food",amount:1,unit:"serve"}],perServe:{calories:321}}],
      mealTemplates:[{name:"Old Meal",items:[{foodId:"legacy-food",amount:1,unit:"serve"}]}],
      daySettings:{"2026-05-09":{type:"normal",targetCal:2000}},
      ui:{diaryDate:"2026-05-09",libraryTab:"saved"}
    }
  };
}

module.exports={FIXTURE_TIME,freshUser,establishedUser,companionUser,earlierAlphaUser};
