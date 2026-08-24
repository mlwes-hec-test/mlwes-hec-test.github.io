# Healthy Eating Companion — Alpha 0.6.18 Revision 2 Build & Test Report

## Primary objective
This revision replaces the previous one-food-at-a-time guided search approach with a universal guided search layer. Every ordinary food query is offered a guided refinement path before raw database records. Family-specific questions are used where HEC has useful structure; all other foods use the same guided shell and finish with closest-record selection plus the standard amount/unit editor.

## Founder examples addressed
- `curry pie` presents `Pie, Curry` and `Pie` as the first guided choices.
- The pie workflow can refine filling/type, protein when relevant, homemade/bakery/commercial/frozen/takeaway source, closest nutrition record and then amount/unit.
- Existing sausage, Australian chain, Recent, copy and Back-state work is retained.
- The Weight Trend period controls include 7 Days, 2 Weeks, 30 Days, 3 Months, 6 Months, 1 Year and All.

## Safety/data rule
The guided engine does not invent a zero-calorie food when a nutrition record is missing. It selects an existing nutrition record or tells the tester to broaden the search, scan/read a label or create a My Food.

## Validation performed
- JavaScript syntax checks on all local scripts.
- JSON and manifest parse checks.
- ZIP archive integrity test.
- Static checks for universal guided-search hooks, curry-pie ordering, graph-period buttons, Recent/copy code and service-worker cache revision.

Real-device testing remains required for iOS keyboard/visual viewport behaviour, camera/microphone permissions and long-session navigation state.
