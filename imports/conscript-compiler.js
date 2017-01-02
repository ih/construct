import walk from 'esprima-walk';

export default class ConscriptCompiler {

  constructor() {

  }

  textToObject3D(programText) {
    let ast = esprima.parse(programText);
    let programObject3D = this.astToObject3D(ast);
    return programObject3D;
  }

  astToObject3D(ast) {
    let programObject = new THREE.Object3D();
    walk(ast, (node) => {
      console.log(node.type);
    });
    return ast;
  }
};

class ASTObject3DMapping {
  constructor() {

  }



}
