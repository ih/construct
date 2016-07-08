import React from 'react';
import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';

import Editor from '../imports/ui/Editor.jsx';

Meteor.startup(() => {
  render(<Editor />, document.getElementById('react-editor'));
});
