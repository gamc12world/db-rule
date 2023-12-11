import cloneDeep from "lodash.clonedeep";
import isEqual from "lodash.isequal";

export interface Consequence {
  (API: API, facts: Fact[]): void;
  ruleRef?: string | undefined;
}

export type Rule = {
  id?: string;
  index?: number;
  name?: string;
  on?: boolean;
  priority?: number;
  condition: (API: API, facts: Fact[]) => void;
  consequence: Consequence;
};

export type Fact = {
  [key: string]: any;
  matchPath?: string[];
};

export type Options = {
  ignoreFactChanges?: boolean;
};

export interface API {
  rule: () => Rule;
  when: (outcome: boolean) => void;
  restart: () => void;
  stop: () => void;
  next: () => void;
}

export class RuleEngine {
  public rules: Rule[] = [];
  public activeRules: Rule[] = [];
  public ignoreFactChanges: boolean = false;

  constructor(options?: Options) {
    if (options) {
      this.ignoreFactChanges = options.ignoreFactChanges || false;
    }
  }

  register(rules: Rule | Rule[]): void {
    if (Array.isArray(rules)) {
      this.rules.push(...rules);
    } else if (rules !== null && typeof rules === "object") {
      this.rules.push(rules);
    }
    this.sync();
  }

  sync(): void {
    this.activeRules = this.rules.filter((a) => {
      if (typeof a.on === "undefined") {
        a.on = true;
      }
      if (a.on === true) {
        return a;
      }
    });
    this.activeRules.sort((a, b) => {
      if (a.priority && b.priority) {
        return b.priority - a.priority;
      } else {
        return 0;
      }
    });
  }

  execute(facts: Fact[], callback: (facts: Fact[]) => void): void {
    const thisHolder = this;
    let complete = false;
    const sessions = cloneDeep(facts);
    let lastSessions = cloneDeep(facts);
    let currentRuleIndex = 0; // Track the current rule index
    const matchPaths: string[][] = Array.from({ length: facts.length }, () => []);
    const ignoreFactChanges = this.ignoreFactChanges;

    function processNextRule() {
      thisHolder.nextTick(() => {
        currentRuleIndex++;
        if (currentRuleIndex < thisHolder.activeRules.length && !complete) {
          executeRule();
        } else {
          for (let i = 0; i < facts.length; i++) {
            sessions[i].matchPath = matchPaths[i];
          }
          callback(sessions);
        }
      });
    }

    function executeRule() {
      const API: API = {
        rule: () => thisHolder.activeRules[currentRuleIndex],
        when: (outcome: boolean) => {
          if (outcome) {
            const _consequence = thisHolder.activeRules[currentRuleIndex].consequence;
            _consequence.ruleRef =
              thisHolder.activeRules[currentRuleIndex].id ||
              thisHolder.activeRules[currentRuleIndex].name ||
              `index_${currentRuleIndex}`;
            thisHolder.nextTick(() => {
              for (let i = 0; i < facts.length; i++) {
                matchPaths[i].push(_consequence.ruleRef as string);
              }
              _consequence.call(sessions, API, sessions);
            });
          } else {
            processNextRule();
          }
        },
        restart: () => {
          currentRuleIndex = 0;
          executeRule();
        },
        stop: () => {
          complete = true;
          processNextRule();
        },
        next: () => {
          processNextRule();
        },
      };

      const _rule = thisHolder.activeRules[currentRuleIndex].condition;
      _rule.call(sessions, API, sessions);
    }

    executeRule(); // Start executing the rules
  }

  nextTick(callback: () => void) {
    process?.nextTick ? process?.nextTick(callback) : setTimeout(callback, 0);
  }

  findRules(query?: Record<string, unknown>) {
    if (typeof query === "undefined") {
      return this.rules;
    }

    // Clean the properties set to undefined in the search query if any to prevent miss match issues.
    Object.keys(query).forEach(
      (key) => query[key] === undefined && delete query[key]
    );

    // Return rules in the registered rules array which match partially to the query.
    return this.rules.filter((rule: any) => {
      return Object.keys(query).some((key: any) => {
        return query[key] === rule[key];
      });
    });
  }

  turn(state: string, filter?: Record<string, unknown>) {
    const rules = this.findRules(filter);
    for (let i = 0, j = rules.length; i < j; i++) {
      rules[i].on = state.toLowerCase() === "on";
    }
    this.sync();
  }

  prioritize(priority: number, filter?: Record<string, unknown>) {
    const rules = this.findRules(filter);
    for (let i = 0, j = rules.length; i < j; i++) {
      rules[i].priority = priority;
    }
    this.sync();
  }
}
