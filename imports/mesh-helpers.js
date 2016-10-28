export var HEAD = 'head';

export function getHead(renderedBody) {
  var head = _.find(renderedBody.children, (mesh) => {
      return mesh.name === HEAD;
  });

  return head ? head : renderedBody;
}
