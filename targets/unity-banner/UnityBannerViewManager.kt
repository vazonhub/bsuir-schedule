package by.vazon.bsuirtime.unitybanner

import android.widget.FrameLayout
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.unity3d.services.banners.BannerView
import com.unity3d.services.banners.UnityBannerSize

class UnityBannerViewManager : SimpleViewManager<FrameLayout>() {
    override fun getName() = "UnityBannerView"

    override fun createViewInstance(context: ThemedReactContext): FrameLayout {
        return FrameLayout(context)
    }

    @ReactProp(name = "placementId")
    fun setPlacementId(view: FrameLayout, placementId: String?) {
        if (placementId.isNullOrEmpty()) return
        view.removeAllViews()
        val banner = BannerView(
            view.context as android.app.Activity,
            placementId,
            UnityBannerSize(320, 50)
        )
        view.addView(banner)
        banner.load()
    }
}
