package com.sagarikabill.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.print.PrintAttributes
import android.print.PrintManager
import android.view.View
import android.widget.Button
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.airbnb.lottie.LottieAnimationView

class MainActivity : AppCompatActivity() {

    private lateinit var rootView: View
    private lateinit var webView: WebView
    private lateinit var splashOverlay: View
    private lateinit var splashAnimation: LottieAnimationView
    private lateinit var offlineOverlay: View
    private lateinit var retryButton: Button
    private var splashDismissed = false
    private val appUrl = "https://sagarikabill.vercel.app/"

    private inner class PrintBridge {
        @JavascriptInterface
        fun print(title: String?) {
            runOnUiThread {
                printCurrentPage(title)
            }
        }
    }

    // The page tells us the colour of its top bar, so the strip behind the
    // status bar matches it in both light and dark mode.
    private inner class BarsBridge {
        @JavascriptInterface
        fun setColor(hex: String?) {
            val color = try {
                android.graphics.Color.parseColor(hex ?: return)
            } catch (error: IllegalArgumentException) {
                return
            }
            runOnUiThread { applyBarColor(color) }
        }
    }

    private fun applyBarColor(color: Int) {
        rootView.setBackgroundColor(color)
        val luminance = (0.299 * android.graphics.Color.red(color) +
            0.587 * android.graphics.Color.green(color) +
            0.114 * android.graphics.Color.blue(color)) / 255
        val lightBars = luminance > 0.6
        WindowCompat.getInsetsController(window, rootView).apply {
            isAppearanceLightStatusBars = lightBars
            isAppearanceLightNavigationBars = lightBars
        }
    }

    private fun injectBarColorHook(view: WebView) {
        val script = """
            (function () {
              if (!window.AndroidBars) return;
              function toHex(c) {
                const m = (c || '').match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/);
                if (!m || (m[4] !== undefined && parseFloat(m[4]) === 0)) return null;
                return '#' + [m[1], m[2], m[3]].map(function (n) {
                  return ('0' + parseInt(n, 10).toString(16)).slice(-2);
                }).join('');
              }
              function report() {
                const nav = document.querySelector('.app-nav');
                const color = (nav && toHex(getComputedStyle(nav).backgroundColor)) ||
                  toHex(getComputedStyle(document.body).backgroundColor) ||
                  toHex(getComputedStyle(document.documentElement).backgroundColor);
                if (color) window.AndroidBars.setColor(color);
              }
              report();
              setTimeout(report, 400);
              if (!window.__androidBarsObserver) {
                window.__androidBarsObserver = new MutationObserver(function () { setTimeout(report, 50); });
                window.__androidBarsObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
              }
            })();
        """.trimIndent()
        view.evaluateJavascript(script, null)
    }

    private fun injectPrintHook(view: WebView) {
        val script = """
            (function () {
              if (window.__androidPrintHookInstalled) return;
              window.__androidPrintHookInstalled = true;
              const nativePrint = window.print ? window.print.bind(window) : null;
              window.print = function () {
                try {
                  if (window.AndroidPrint && typeof window.AndroidPrint.print === 'function') {
                    window.AndroidPrint.print(document.title || '');
                    return;
                  }
                } catch (e) {}
                if (nativePrint) nativePrint();
              };
            })();
        """.trimIndent()
        view.evaluateJavascript(script, null)
    }

    private fun printCurrentPage(rawTitle: String?) {
        val safeTitle = rawTitle
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.replace(Regex("[\\\\/:*?\"<>|]"), "_")
            ?: "Sagarika_Document"

        val printManager = getSystemService(Context.PRINT_SERVICE) as? PrintManager ?: return
        val adapter = webView.createPrintDocumentAdapter(safeTitle)
        printManager.print(
            safeTitle,
            adapter,
            PrintAttributes.Builder().build()
        )
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Android 15 draws apps under the status bar. Pad the content so the page
        // starts below the status bar, above the gesture bar, and above the keyboard.
        rootView = findViewById(R.id.root)
        ViewCompat.setOnApplyWindowInsetsListener(rootView) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            view.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, ime.bottom))
            WindowInsetsCompat.CONSUMED
        }

        webView = findViewById(R.id.webView)
        splashOverlay = findViewById(R.id.splashOverlay)
        splashAnimation = findViewById(R.id.splashAnimation)
        offlineOverlay = findViewById(R.id.offlineOverlay)
        retryButton = findViewById(R.id.retryButton)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.loadsImagesAutomatically = true
        webView.settings.mediaPlaybackRequiresUserGesture = false
        webView.settings.setSupportZoom(true)
        webView.settings.builtInZoomControls = true
        webView.settings.displayZoomControls = false
        webView.settings.useWideViewPort = true
        webView.settings.loadWithOverviewMode = true

        webView.addJavascriptInterface(PrintBridge(), "AndroidPrint")
        webView.addJavascriptInterface(BarsBridge(), "AndroidBars")
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url ?: return false
                val appHost = Uri.parse(appUrl).host
                // Stay in the app for its own pages; open anything else (WhatsApp, maps,
                // phone links, other sites) outside, so other sites never see AndroidPrint.
                if (url.host == appHost && (url.scheme == "https" || url.scheme == "http")) {
                    return false
                }
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                    true
                } catch (error: Exception) {
                    true
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    showOfflineOverlay()
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (view != null) {
                    hideOfflineOverlay()
                    injectPrintHook(view)
                    injectBarColorHook(view)
                    view.postDelayed({ dismissSplash() }, 350)
                }
            }
        }

        retryButton.setOnClickListener {
            attemptLoad()
        }

        if (savedInstanceState == null) {
            attemptLoad()
        } else {
            webView.restoreState(savedInstanceState)
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    private fun attemptLoad() {
        if (isInternetAvailable()) {
            hideOfflineOverlay()
            webView.loadUrl(appUrl)
        } else {
            showOfflineOverlay()
        }
    }

    private fun showOfflineOverlay() {
        offlineOverlay.visibility = View.VISIBLE
        webView.visibility = View.GONE
        dismissSplash()
    }

    private fun hideOfflineOverlay() {
        offlineOverlay.visibility = View.GONE
        webView.visibility = View.VISIBLE
    }

    private fun isInternetAvailable(): Boolean {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false
        val activeNetwork = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun dismissSplash() {
        if (splashDismissed) {
            return
        }

        splashDismissed = true
        splashOverlay.animate()
            .alpha(0f)
            .setDuration(220)
            .withEndAction {
                splashAnimation.cancelAnimation()
                splashOverlay.visibility = View.GONE
            }
            .start()
    }
}
