// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import routes from '../constants/routes.json';
import styles from './Home.css';

type Props = {};

export default class Home extends Component<Props> {
  props: Props;

  print = () => {
    ipcRenderer.send('print')
  }

  render() {
    return (
      <div className={styles.container} data-tid="container">
        <h2>Home</h2>
        <button onClick={this.print}>Print</button>
        <Link to={routes.COUNTER}>to Counter</Link>
      </div>
    );
  }
}
