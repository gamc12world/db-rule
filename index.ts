import { RuleEngine, Rule } from "./src/rule";

const fact1 = { name: "John", transactionTotal: 200, lname:"gupta" };
const fact2 = { name: "Doe", transactionTotal: 300, lname: "markon" };

const ruleEngine = new RuleEngine();

const rule: Rule[] = [
  {
    condition: function (R: any, facts: any) {
      R.when(true);
    },
    consequence: function (R, facts) {
      facts.forEach((fact,index) => {
        fact.result = false;
        fact.reason1 = `there is an 1st in this program`;
      });
      R.stop();
    },
  }
];

ruleEngine.register(rule);

const facts = [fact1, fact2];

ruleEngine.execute([], (resultFacts) => {
  console.log(resultFacts);
});
