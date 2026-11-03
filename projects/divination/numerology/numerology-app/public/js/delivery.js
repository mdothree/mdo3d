// Settle a premium delivery once the reading response is in. A reading that was
// superseded (inputs changed or cleared) or whose banner left the page must not
// use up the local credit: drop the banner and report false.
export function settleDelivery({ isCurrent, banner, consume }) {
  if (!isCurrent() || !banner.isConnected) {
    banner.remove();
    return false;
  }
  consume();
  return true;
}
