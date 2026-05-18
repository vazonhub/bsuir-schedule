import UIKit
import UnityAds

/// React Native ViewManager that wraps a Unity Ads BannerView.
@objc(UnityBannerViewManager)
class UnityBannerViewManager: RCTViewManager {
  override func view() -> UIView! {
    return UnityBannerContainer()
  }

  override static func requiresMainQueueSetup() -> Bool { true }
}

class UnityBannerContainer: UIView, UADSBannerViewDelegate {
  private var bannerView: UADSBannerView?

  private var _placementId: String = "" {
    didSet { loadBanner() }
  }

  @objc func setPlacementId(_ val: String) {
    _placementId = val
  }

  private func loadBanner() {
    bannerView?.removeFromSuperview()
    guard !_placementId.isEmpty else { return }

    let banner = UADSBannerView(placementId: _placementId, size: CGSize(width: 320, height: 50))
    banner.delegate = self
    banner.translatesAutoresizingMaskIntoConstraints = false
    addSubview(banner)
    NSLayoutConstraint.activate([
      banner.leadingAnchor.constraint(equalTo: leadingAnchor),
      banner.trailingAnchor.constraint(equalTo: trailingAnchor),
      banner.topAnchor.constraint(equalTo: topAnchor),
      banner.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
    bannerView = banner
    banner.load()
  }

  // MARK: - UADSBannerViewDelegate
  func bannerViewDidLoad(_ bannerView: UADSBannerView) {}
  func bannerViewDidClick(_ bannerView: UADSBannerView) {}
  func bannerViewDidError(_ bannerView: UADSBannerView, error: UADSBannerError) {
    print("[UnityBanner] Error: \(error)")
  }
  func bannerViewDidLeaveApplication(_ bannerView: UADSBannerView) {}
}
