var Programs = null;
var globalScope = window;

export default class Eval {

  constructor(ProgramsCollection) {
    Programs = ProgramsCollection;
  }

  evalModule(constructModule) {
    var self = this;

    globalScope[constructModule.name] = {};
    var moduleObject = globalScope[constructModule.name];
    eval(constructModule.code);
    var parseTree = esprima.parse(constructModule.code);
    var declarations = _.filter(parseTree.body, (node) => {
      return node.type.indexOf('Declaration') > 0;
    });
    _.each(declarations, (declaration) => {
      var name = self.getDeclarationName(declaration);
      moduleObject[name] = eval(name);
    });
  }

  getDeclarationName(declaration) {
    if (declaration.type === 'VariableDeclaration') {
      return declaration.declarations[0].id.name;
    } else {
      return declaration.id.name;
    }
  }

  evalModuleWithDependencies(moduleName) {
    var self = this;
    var module = Programs.findOne({name: moduleName});
    var modulesToEvaluate = module ? [module] : [];
    // dependencies that have been evaluated in past calls to eval
    // or have already been added to the stack of modules to evaluate
    var modulesVisited = {};

    while (!_.isEmpty(modulesToEvaluate)) {
      var current = modulesToEvaluate.pop();
      // if all the imports have already been evaluated
      // evaluate current, otherwise
      var unvisitedModuleNames = _.reject(current.imports, hasBeenVisited);
      var unvisitedModules = _.isEmpty(unvisitedModuleNames) ? [] :
            _.compact(Programs.find({name: unvisitedModuleNames}).fetch());
      if (_.isEmpty(unvisitedModules)) {
        self.evalModule(current);
      } else {
        modulesToEvaluate.push(current);

        _.each(unvisitedModules, (unvisitedModule) => {
          modulesToEvaluate.push(unvisitedModule);
          modulesVisited[unvisitedModule.name] = true;
        });
      };
    }

    function hasBeenVisited(module) {
      return _.has(globalScope, module.name) ||
        _.has(modulesVisited, module.name);
    }
  }

/*
   Evaluate programFunction after all of the modules in the import chain/tree
   have been evaluated (either in during this call or previously)
 */
  evalProgramWithDependencies(programFunction, program) {
    var self = this;
    var unevaluatedImports = _.reject(program.imports, hasBeenEvaluated);

    _.each(unevaluatedImports, (moduleName) => {
      self.evalModuleWithDependencies(moduleName);
    });

    return eval(programFunction);

    function hasBeenEvaluated(moduleName) {
      return _.has(globalScope, moduleName);
    }
  }
};
