import { Component } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { from, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Cell, Form, Game, ValidatedForm } from '../models';

@Component({
  selector: 'ms-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent {
  game!: Game;
  form = new Form();
  newGameSubject = new Subject();
  botSubscription?: Subscription;
  isVictory: boolean | null = null;

  constructor(private domSanitizer: DomSanitizer) {
    this.newGame();
  }

  get gridAutoSize(): SafeStyle {
    const width = '100vw';
    const height = '100vh';
    const ret = `min(${width} / ${this.game.rows}, ${height} / ${this.game.columns})`;
    return this.domSanitizer.bypassSecurityTrustStyle(`max(${ret}, 2em)`);
  }

  get showError(): boolean {
    const hiddenCells = this.game.grid
      .filter(cell => cell.hidden);

    return this.isVictory === null
      && hiddenCells.length === this.form.mines;
  }

  async check(cell: Cell) {
    if (this.isVictory !== null)
      return;

    const wasMineChecked = this.game.isMine(cell);
    if (wasMineChecked === false)
      return;

    this.isVictory = wasMineChecked === null;
    await new Promise(r => setTimeout(() => r(), this.isVictory ? 6000 : 3000));
    this.newGame();
    this.isVictory = null;
  }

  async scan(cell: Cell) {
    this.game.scan(cell)
      .forEach(item => item.hidden && this.check(item));
  }

  newGame() {
    this.newGameSubject.next();

    if (this.botSubscription !== undefined)
      this.botSubscription.unsubscribe();

    const form = this.form as ValidatedForm;

    if (form.mines >= form.rows * form.columns - 1)
      throw new Error('invalid form');

    this.game = new Game(undefined, form.rows, form.columns, form.mines);
    if (!this.form.isBotEnabled) return;
    this.botSubscription = from(this.botPlay(this.game)).pipe(takeUntil(this.newGameSubject)).subscribe(didWin => {
      setTimeout(() => {
        alert(`Bot ${didWin ? 'win' : 'lose'}`);
        this.newGame();
      });
    });
  }

  get percentStillHidden(): string {
    if (!this.form.columns || !this.form.rows || !this.form.mines)
      return '0';
    const hidden = this.game.grid.filter(cell => cell.hidden);
    return (100 - ((hidden.length - this.form.mines) / (this.form.rows * this.form.columns - this.form.mines) * 100)).toFixed(0);
  }

  get percentMines(): string {
    if (!this.form.columns || !this.form.rows || !this.form.mines)
      return '0';
    return (this.form.mines / (this.form.rows * this.form.columns) * 100).toFixed(0);
  }


  private async botPlay(game: Game): Promise<boolean> {
    const cell = await game.getBotMove();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const dugMine = await game.isMine(cell);
    if (dugMine === false) return this.botPlay(game);
    return dugMine === undefined;
  }
}
