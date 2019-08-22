(() => {
  function f(k) {
    //    k:  0  1  2  3  4  5  6...
    // f(k):  0 -1  1 -2  2 -3  3...
    const sign = k % 2 === 0 ? 1 : -1;
    return sign * Math.floor((k + 1) / 2);
  }

  function add(a, b) {
    // add two complex numbers
    // a, b: complex number
    return {
      real: a.real + b.real,
      imag: a.imag + b.imag,
    };
  }

  function mul(a, b) {
    // multiply two complex numbers
    // a, b: complex number
    return {
      real: a.real * b.real - a.imag * b.imag,
      imag: a.real * b.imag + a.imag * b.real,
    };
  }

  function dft(xs) {
    // discrete fourier transform
    // xs: array of complex numbers
    const N = xs.length;
    const Xs = [];

    for (let k = 0; k < N; k++) {
      Xs.push(
        xs.reduce(
          (X, x, n) => {
            const phi = (2 * Math.PI * f(k) * n) / N;

            return add(
              X,
              mul(x, {
                real: Math.cos(phi),
                imag: -Math.sin(phi),
              })
            );
          },
          { real: 0, imag: 0 }
        )
      );
    }
    return Xs;
  }

  function computeSinusoids(Xs, threshold = 2) {
    // compute sinusoids from Xs
    // Xs: returned from dft()
    // threshold: amplitude threshold for filtering
    const N = Xs.length;
    return Xs.map((X, k) => ({
      freq: f(k),
      amp: Math.sqrt(X.real ** 2 + X.imag ** 2) / N,
      phase: Math.atan2(X.imag, X.real),
    }))
      .filter(sinusoid => sinusoid.amp >= threshold)
      .sort((a, b) => b.amp - a.amp);
  }

  function computeEpicycles(sinusoids, t = 0) {
    // compute epicycles for given Xs and t
    // sinusoids: returned from computeSinusoids()
    // t: time
    const circles = [];
    let x = 0;
    let y = 0;

    sinusoids.forEach(sinusoid => {
      circles.push({
        x,
        y,
        radius: sinusoid.amp,
      });

      x += sinusoid.amp * Math.cos(sinusoid.freq * t + sinusoid.phase);
      y += sinusoid.amp * Math.sin(sinusoid.freq * t + sinusoid.phase);
    });

    return { circles, tip: { x, y } };
  }

  function drawEpicycles(ctx, epicycles, x = 0, y = 0) {
    // draw epicycles on ctx
    // ctx: canvas context
    // epicycles: returned from computeEpicycles()
    // x: x offset of drawing
    // y: y offset of drawing
    ctx.save();
    ctx.translate(x, y);

    epicycles.circles.reduce((prev, circle) => {
      ctx.save();

      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#777';
      ctx.stroke();

      if (prev) {
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(circle.x, circle.y);
        ctx.strokeStyle = '#ccc';
        ctx.stroke();
      }

      ctx.restore();

      return circle;
    }, null);

    const lastCircle = epicycles.circles[epicycles.circles.length - 1];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lastCircle.x, lastCircle.y);
    ctx.lineTo(epicycles.tip.x, epicycles.tip.y);
    ctx.strokeStyle = '#ccc';
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(epicycles.tip.x, epicycles.tip.y);
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f0';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function drawPath(ctx, path, x = 0, y = 0) {
    // draw path of tip
    // ctx: canvas context
    // path: array of point
    // x: x offset of drawing
    // y: y offset of drawing
    ctx.save();
    ctx.translate(x, y);

    ctx.beginPath();
    path.reduce((prev, point) => {
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(point.x, point.y);
      return point;
    });
    ctx.strokeStyle = '#666';
    ctx.stroke();

    ctx.restore();
  }

  function drawPoints(ctx, points, x = 0, y = 0) {
    // draw points on ctx
    // ctx: canvas context
    // points: array of point
    // x: x offset of drawing
    // y: y offset of drawing
    ctx.save();
    ctx.translate(x, y);

    points.forEach(point => {
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, 2 * Math.PI);
      ctx.fillStyle = '#f00';
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  }

  function pointsToComplexes(points) {
    // convert point array into complex number array
    return points.map(point => ({ real: point.x, imag: point.y }));
  }

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const points = [
    { x: 0, y: 0 },
    { x: 50, y: 50 },
    { x: 100, y: 0 },
    { x: 50, y: -50 },
    { x: 0, y: -100 },
    { x: -50, y: -50 },
    { x: -100, y: 0 },
    { x: -50, y: 50 },
  ];
  let sinusoids = computeSinusoids(dft(pointsToComplexes(points)));
  const path = [];
  let t = 0;
  let drawing = false;

  canvas.addEventListener('mousedown', e => {
    drawing = true;
    points.splice(0);
    path.splice(0);
  });
  canvas.addEventListener('mousemove', e => {
    if (drawing) {
      points.push({
        x: e.offsetX - canvas.width / 2,
        y: e.offsetY - canvas.height / 2,
      });
    }
  });
  canvas.addEventListener('mouseup', e => {
    drawing = false;
    sinusoids = computeSinusoids(dft(pointsToComplexes(points)));
    t = 0;
  });

  function runAnimationLoop(loop) {
    let prevTick;

    function wrappedLoop(tick) {
      if (prevTick) {
        loop(tick / 1000, (tick - prevTick) / 1000);
      }
      prevTick = tick;
      requestAnimationFrame(wrappedLoop);
    }
    requestAnimationFrame(wrappedLoop);
  }

  runAnimationLoop((_, dt) => {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    drawPoints(ctx, points, canvas.width / 2, canvas.height / 2);

    if (!drawing) {
      const epicycles = computeEpicycles(sinusoids, t);

      path.push(epicycles.tip);
      if (path.length > 100) {
        path.splice(0, 1);
      }

      drawEpicycles(ctx, epicycles, canvas.width / 2, canvas.height / 2);
      drawPath(ctx, path, canvas.width / 2, canvas.height / 2);

      t = (t + dt) % (2 * Math.PI);
    }
  });
})();
