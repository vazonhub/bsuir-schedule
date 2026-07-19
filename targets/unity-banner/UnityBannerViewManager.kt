package by.vazon.bsuirtime.unitybanner

import android.app.Activity
import android.content.ContextWrapper
import android.util.Log
import android.widget.FrameLayout
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.unity3d.services.banners.BannerErrorInfo
import com.unity3d.services.banners.BannerView
import com.unity3d.services.banners.UnityBannerSize

private const val TAG = "UnityBanner"

class UnityBannerViewManager : SimpleViewManager<FrameLayout>() {
    override fun getName() = "UnityBannerView"

    override fun createViewInstance(context: ThemedReactContext): FrameLayout {
        return FrameLayout(context)
    }

    private fun resolveActivity(view: FrameLayout): Activity? {
        var ctx = view.context
        while (ctx is ContextWrapper) {
            if (ctx is Activity) return ctx
            ctx = ctx.baseContext
        }
        return null
    }

    @ReactProp(name = "placementId")
    fun setPlacementId(view: FrameLayout, placementId: String?) {
        if (placementId.isNullOrEmpty()) return
        val activity = resolveActivity(view)
        if (activity == null) {
            Log.w(TAG, "Could not resolve Activity from view context")
            return
        }
        view.removeAllViews()
        try {
            val banner = BannerView(activity, placementId, UnityBannerSize(320, 50))
            banner.listener = object : BannerView.IListener {
                override fun onBannerLoaded(v: BannerView?) {
                    Log.i(TAG, "Banner loaded for placement: $placementId")
                }
                override fun onBannerShown(v: BannerView?) {
                    Log.i(TAG, "Banner shown")
                }
                override fun onBannerFailedToLoad(v: BannerView?, error: BannerErrorInfo?) {
                    Log.w(TAG, "Banner failed to load: ${error?.errorMessage}")
                }
                override fun onBannerClick(v: BannerView?) {
                    Log.i(TAG, "Banner clicked")
                }
                override fun onBannerLeftApplication(v: BannerView?) {}
            }
            view.addView(banner)
            banner.load()
            Log.i(TAG, "Banner load() called for placement: $placementId, activity: ${activity.javaClass.simpleName}")
        } catch (e: Exception) {
            Log.e(TAG, "Banner creation failed: ${e.message}")
        }
    }
}
