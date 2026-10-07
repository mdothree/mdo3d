# Firestore rules tests

Emulator tests for the rules files that are deployed to the MDO3 Firebase projects:

| Test | Rules file | Project |
|---|---|---|
| `career.test.mjs` | `shared/career/firestore.rules` | mdo3d-career (rigor) |
| `utilities.test.mjs` | `shared/utilities/firestore.rules` (= `projects/mdothree/mdothree-api/firestore.rules`) | mdo3d-utilities (mdothree) |
| `leads.test.mjs` | `shared/leads/firestore.rules` (= `projects/ronnascanner/resume-analyzer/firestore.rules`) | mdo3d-leads |

Run (needs JDK 21+; the system Java 11 is too old for firebase-tools 15):

```bash
cd shared/rules-tests
npm install
JAVA_HOME=/opt/homebrew/opt/openjdk PATH=/opt/homebrew/opt/openjdk/bin:$PATH npm test
```

Run these before every `firebase deploy --only firestore:rules`.
