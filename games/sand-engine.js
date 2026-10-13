// Cell occupancy drives collisions: one grain occupies one cell.
class SandWorld {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.types = new Uint8Array(cols * rows); // 0 empty, 1 sand, 2 fixed paint
    this.colors = new Uint32Array(cols * rows);
    this.sandCount = 0;
    this.wallCount = 0;
    this.tick = 0;
    this.firstRow = rows;
    this.firstColumn = cols;
    this.lastColumn = 0;
    this.needsSimulation = false;
    this.dirty = true;
  }
  set(x, y, type, color = 0) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return false;
    color = type ? color : 0;
    const index = y * this.cols + x;
    const previous = this.types[index];
    if (previous === type && this.colors[index] === color) return false;
    if (previous === 1) this.sandCount--;
    if (previous === 2) this.wallCount--;
    this.types[index] = type;
    this.colors[index] = type ? color : 0;
    if (type === 1) this.sandCount++;
    if (type === 2) this.wallCount++;
    this.firstRow = Math.min(this.firstRow, Math.max(0, y - 1));
    this.firstColumn = Math.min(this.firstColumn, x);
    this.lastColumn = Math.max(this.lastColumn, x);
    this.needsSimulation = true;
    this.dirty = true;
    return true;
  }
  pour(x, y, color) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows || this.types[y * this.cols + x]) return false;
    return this.set(x, y, 1, color);
  }
  step() {
    if (!this.needsSimulation || !this.sandCount) return 0;
    let moved = 0;
    this.tick++;
    const rightward = this.tick % 2 === 0;
    const firstColumn = Math.max(0, this.firstColumn - 1);
    const lastColumn = Math.min(this.cols - 1, this.lastColumn + 1);
    for (let y = this.rows - 2; y >= this.firstRow; y--) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        const x = rightward ? column : lastColumn - (column - firstColumn);
        const source = y * this.cols + x;
        if (this.types[source] !== 1) continue;
        const below = source + this.cols;
        let target = -1;
        if (!this.types[below]) target = below;
        else {
          const direction = (x + y + this.tick) % 2 ? 1 : -1;
          for (const side of [direction, -direction]) {
            const nx = x + side;
            // Passing beside a wall is blocked; sand can slide along a slope.
            if (nx >= 0 && nx < this.cols && this.types[source + side] !== 2 && !this.types[below + side]) {
              target = below + side;
              break;
            }
          }
        }
        if (target < 0) continue;
        this.firstColumn = Math.min(this.firstColumn, target % this.cols);
        this.lastColumn = Math.max(this.lastColumn, target % this.cols);
        this.types[target] = 1;
        this.colors[target] = this.colors[source];
        this.types[source] = 0;
        this.colors[source] = 0;
        moved++;
      }
    }
    this.needsSimulation = moved > 0;
    if (moved) this.dirty = true;
    return moved;
  }
  clear() {
    this.types.fill(0);
    this.colors.fill(0);
    this.sandCount = this.wallCount = 0;
    this.firstRow = this.rows;
    this.firstColumn = this.cols;
    this.lastColumn = 0;
    this.needsSimulation = false;
    this.dirty = true;
  }
  snapshot() {
    return { cols: this.cols, rows: this.rows, types: this.types.slice(), colors: this.colors.slice() };
  }
  restore(snapshot) {
    this.clear();
    // Fit the old drawing inside the new viewport, centered and bottom-aligned.
    const scale = Math.min(this.cols / snapshot.cols, this.rows / snapshot.rows);
    const offsetX = (this.cols - snapshot.cols * scale) / 2;
    const offsetY = this.rows - snapshot.rows * scale;
    for (let y = 0; y < this.rows; y++) {
      const oldY = Math.floor((y - offsetY) / scale);
      if (oldY < 0 || oldY >= snapshot.rows) continue;
      for (let x = 0; x < this.cols; x++) {
        const oldX = Math.floor((x - offsetX) / scale);
        if (oldX < 0 || oldX >= snapshot.cols) continue;
        const index = oldY * snapshot.cols + oldX;
        if (snapshot.types[index]) this.set(x, y, snapshot.types[index], snapshot.colors[index]);
      }
    }
  }
}
window.SandWorld = SandWorld;
