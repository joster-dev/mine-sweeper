import { Component } from '@angular/core';

import { Cell } from './cell/cell';
import { Form } from './form/form';
import { Game } from './game';

import { Subscription, from, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ValidatedForm } from './form/validated-form';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

@Component({
  selector: 'ms-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent {
  botSubscription?: Subscription;
  form = new Form();
  game!: Game;
  newGameSubject = new Subject();

  constructor(private domSanitizer: DomSanitizer) {
    this.newGame();
  }

  get gridAutoSize(): SafeStyle {
    const width = 'calc(100vw - 1em)';
    const height = '100vh';
    const ret = `min(${width} / ${this.game.rows}, ${height} / ${this.game.columns})`;
    return this.domSanitizer.bypassSecurityTrustStyle(`max(${ret}, 2em)`);
  }

  check(cell: Cell) {
    const dugMine = this.game.dig(cell);
    if (dugMine === false)
      return;
    setTimeout(() => {
      alert(`You ${dugMine === true ? 'lose' : 'win'}`);
      this.newGame();
    }, 1000);
  }

  scan(cell: Cell) {
    this.game.scan(cell).forEach(item => item.hidden && this.check(item));
  }

  newGame() {
    this.newGameSubject.next();

    if (this.botSubscription !== undefined)
      this.botSubscription.unsubscribe();

    const form = this.form as ValidatedForm;

    if (form.mines >= form.rows * form.columns - 1)
      throw new Error('invalid form');

    this.game = new Game(form.rows, form.columns, form.mines);
    if (!this.form.isBotEnabled) return;
    this.botSubscription = from(this.botPlay(this.game)).pipe(takeUntil(this.newGameSubject)).subscribe(didWin => {
      setTimeout(() => {
        alert(`Bot ${didWin ? 'win' : 'lose'}`);
        this.newGame();
      });
    });
  }

  private async botPlay(game: Game): Promise<boolean> {
    const cell = await game.getBotMove();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const dugMine = game.dig(cell);
    if (dugMine === false) return this.botPlay(game);
    return dugMine === undefined;
  }
}
