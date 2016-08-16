export var MODULE = 'module';
export var USER = 'user';

export function userProgramIsMoving(renderedUser, userProgram) {
  var keyPressed = userProgram && (
    userProgram.moveForward || userProgram.moveBackward ||
        userProgram.rotateRight || userProgram.rotateLeft);
  var linearVelocity = renderedUser.getLinearVelocity().toArray();
  var hasLinearVelocity = Math.round(_.max(linearVelocity)) > 0 ||
        Math.round(_.min(linearVelocity)) < 0;
  var angularVelocity = renderedUser.getAngularVelocity().toArray();
  var hasAngularVelocity = Math.round(_.max(angularVelocity)) > 0 || Math.round(_.min(angularVelocity)) < 0;
  return keyPressed || hasLinearVelocity || hasAngularVelocity;
}

export function onlyMovementAttributes(fieldNames) {
  return _.union(fieldNames, ['position', 'rotation']).length === 2 ||
    _.isEqual(fieldNames, ['position']) || _.isEqual(fieldNames, ['rotation']);
}
