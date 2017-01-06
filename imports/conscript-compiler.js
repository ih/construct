import walk from 'esprima-walk';
import shortid from 'shortid';

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
    walk.walkAddParent(ast, (node) => {
      console.log(node.type);
      node.id = shortid.generate();
      console.log(node.parent);
    });
    return ast;
  }
};

class ASTObject3DMapping {
  constructor() {

  }



}
