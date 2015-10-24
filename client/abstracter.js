console.log('starting the abstracter');

console.log(esprima.parse("function test(x) {return x*x;}"));

class IdGenerator {
  constructor() {
    this.prefixCounter = {};
  }

  generate(prefix='x') {
    var count = 0;
    if (prefix in this.prefixCounter) {
      count = this.prefixCounter[prefix] += 1;
    }
    this.prefixCounter[prefix] = count;
    return {
      type: 'identifier',
      string: prefix + count
    };
  }
}

var idGenerator = new IdGenerator();

function generateAbstraction(ast1, ast2) {
  // initialize an empty ast that will be the abstracted function
  var abstractedAst = null;
  // var abstractedAst = {
  //   type: 'FunctionDeclaration',
  //   id: idGenerator.generate('f'),
  //   params: []
  // };
  // keep track of where we are in the traversal of the asts
  // also keep the

  var ast1Queue1 = [[ast1, abstractedAst]];
  var ast2Queue1 = [ast2];
  while (ast1Queue1.length > 0) {
    var [currentNodeAst1, currentAbstraction] = ast1Queue1.shift();
    var currentNodeAst2 = ast2Queue1.shift();
    if (areNodesEqual(currentNodeAst1, currentNodeAst2)) {
      // handle all the different types here?
    } else {
      // create a variable node and add to body of currentAbstraction
    }
  }
  if (areNodesEqual(ast1, ast2)) {
    // make a copy of the current node with an empty body and set it to the body
    // of the current ast
  }
}

function areNodesEqual(ast1, ast2) {
  return ast1.type === ast2;
}
