import cloneDeep from "lodash.clonedeep";
import isEqual from "lodash.isequal";
import { Fact, RuleEngine, API } from "./rules";

// Simulate SmartWeave namespace with dummy data
namespace SmartWeave {
  interface Transaction {
    id: string;
    owner: string;
    tags: Record<string, string>;
    quantity: number;
    target: string;
    reward: number;
  }

  interface Contract {
    id: string;
    owner: string;
  }

  interface API {
    transaction: Transaction;
    contract: Contract;
  }

  export const transaction: Transaction = {
    id: "anishgupta",
    owner: "dummyTransactionOwner",
    tags: { key1: "value1", key2: "value2" },
    quantity: 100,
    target: "dummyTarget",
    reward: 5,
  };
  export const contract: Contract = {
    id: "dummyContractId",
    owner: "dummyContractOwner",
  };
}

export type FactWithTransactionAndContract = Fact & {
  transactionId: string;
  transactionOwner: string;
  transactionQuantity: number;
  contractId: string;
  contractOwner: string;
};
export interface ExtendedAPI extends API {
  transaction: {
    id: string;
    owner: string;
    quantity: number;
    target: string;
    reward: number;
  };
  contract: {
    id: string;
    owner: string;
  };
}
export class ExtendedRuleEngine extends RuleEngine {
  execute(fact: Fact, callback: (fact: Fact) => void): void {
    const thisHolder = this;
    let complete = false;
    const session = cloneDeep(fact);
    let lastSession = cloneDeep(fact);
    let rules = this.activeRules;
    const matchPath: string[] = [];
    const ignoreFactChanges = this.ignoreFactChanges;
    (session as FactWithTransactionAndContract).transactionId =
      SmartWeave.transaction.id;
    (session as FactWithTransactionAndContract).transactionOwner =
      SmartWeave.transaction.owner;
    (session as FactWithTransactionAndContract).transactionQuantity =
      SmartWeave.transaction.quantity;
    (session as FactWithTransactionAndContract).transactionTarget =
      SmartWeave.transaction.target;
    (session as FactWithTransactionAndContract).transactionTarget =
      SmartWeave.transaction.target;
    (session as FactWithTransactionAndContract).transactionReward =
      SmartWeave.transaction.reward;
    (session as FactWithTransactionAndContract).contractId =
      SmartWeave.contract.id;
    (session as FactWithTransactionAndContract).contractOwner =
      SmartWeave.contract.owner;

    function FnRuleLoop(x: number) {
      const API: ExtendedAPI = {
        ...{
          rule: () => rules[x],
          when: (outcome: boolean) => {
            if (outcome) {
              const _consequence = rules[x].consequence;
              _consequence.ruleRef =
                rules[x].id || rules[x].name || `index_${x}`;
              const ruleRef = _consequence.ruleRef as string;

              if (!matchPath.includes(ruleRef)) {
                matchPath.push(ruleRef);
                thisHolder.nextTick(() => {
                  _consequence.call(session, API, session);
                });
              } else {
                thisHolder.nextTick(() => {
                  API.next();
                });
              }
            } else {
              thisHolder.nextTick(() => {
                API.next();
              });
            }
          },

          restart: () => FnRuleLoop(0),
          stop: () => {
            complete = true;
            return FnRuleLoop(0);
          },
          next: () => {
            if (!ignoreFactChanges && !isEqual(lastSession, session)) {
              lastSession = cloneDeep(session);
              thisHolder.nextTick(() => {
                API.restart();
              });
            } else {
              thisHolder.nextTick(() => {
                return FnRuleLoop(x + 1);
              });
            }
          },
        },
        transaction: {
          id: SmartWeave.transaction.id,
          owner: SmartWeave.transaction.owner,
          quantity: SmartWeave.transaction.quantity,
          target: SmartWeave.transaction.target,
          reward: SmartWeave.transaction.reward,
        },
        contract: {
          id: SmartWeave.contract.id,
          owner: SmartWeave.contract.owner,
        },
      };

      rules = thisHolder.activeRules;
      if (x < rules.length && !complete) {
        const _rule = rules[x].condition;
        _rule.call(session, API, session);
      } else {
        thisHolder.nextTick(() => {
          session.matchPath = matchPath;
          callback(session);
        });
      }
    }
    FnRuleLoop(0);
  }
}
