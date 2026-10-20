// Loaded before the bundled game, including when index.html is opened from disk.
(function () {
  var pending = true;
  var timer;
  function onError() { fail(); }
  function cleanup() {
    clearTimeout(timer);
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onError);
  }
  function fail(title, message) {
    if (!pending) return;
    pending = false;
    cleanup();
    var loading = document.getElementById('loading');
    loading.hidden = false;
    loading.classList.add('loading-error');
    var heading = document.createElement('strong');
    heading.textContent = title || '包子铺暂时没有开张';
    var detail = document.createElement('p');
    detail.textContent = message || '请使用最新版 Chrome、Edge 或 Firefox 打开，并在浏览器设置中开启硬件加速。';
    var retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '重新开张';
    retry.addEventListener('click', function () { location.reload(); });
    loading.replaceChildren(heading, detail, retry);
  }
  window.BaoziStartup = {
    fail: fail,
    ready: function () {
      if (!pending) return;
      pending = false;
      cleanup();
      document.getElementById('loading').hidden = true;
    },
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onError);
  timer = setTimeout(function () {
    fail('蒸笼加热时间有点长', '请关闭其他占用显卡的页面，再重新打开；也可以换用最新版 Chrome 或 Edge。');
  }, 30000);
}());
