export default class ConscriptCompiler {

  constructor() {

  }

  textToObject3D(programText) {
    let ast = esprima.parse(programText);
    let programObject3D = this.astToObject3D(ast);
    return programObject3D;
  }

  astToObject3D(ast) {
    return ast;
  }
};
