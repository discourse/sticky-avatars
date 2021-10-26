import { apiInitializer } from "discourse/lib/api";
import Site from "discourse/models/site";
import { schedule } from "@ember/runloop";

export default apiInitializer("0.11.1", (api) => {
  if (Site.currentProp("mobileView")) {
    return;
  }

  const STICKY_CLASS = "sticky-avatar";
  const TOPIC_POST_SELECTOR = "#topic .post-stream .topic-post";

  let intersectionObserver;
  let direction = "⬇️";
  let prevOffset = -1;
  function _handleScroll(offset) {
    if (offset >= prevOffset) {
      direction = "⬇️";
    } else {
      direction = "⬆️";
    }

    prevOffset = offset;

    if (offset <= 0) {
      direction = "⬇️";

      document
        .querySelectorAll(`${TOPIC_POST_SELECTOR}.${STICKY_CLASS}`)
        .forEach((node) => node.classList.remove(STICKY_CLASS));
    }
  }

  function _applyMarginOnOp(op) {
    const topicAvatarNode = op.querySelector(".topic-avatar");

    if (!topicAvatarNode) {
      return;
    }

    if (op.querySelector("#post_1")) {
      const topicMapNode = op.querySelector(".topic-map");
      if (topicMapNode) {
        topicAvatarNode.style.marginBottom = `${topicMapNode.clientHeight}px`;
        return;
      }
    }

    topicAvatarNode.style.marginBottom = null;
  }

  function _handlePostNodes() {
    _clearIntersectionObserver();

    schedule("afterRender", () => {
      _initIntersectionObserver();

      document.querySelectorAll(TOPIC_POST_SELECTOR).forEach((postNode) => {
        _applyMarginOnOp(postNode);
        intersectionObserver.observe(postNode);
      });
    });
  }

  function _initIntersectionObserver() {
    const headerHeight = document.querySelector(".d-header")?.clientHeight || 0;

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio === 1) {
            entry.target.classList.remove(STICKY_CLASS);
            return;
          }

          const postContentHeight = entry.target.querySelector(".contents")
            ?.clientHeight;
          if (
            direction === "⬆️" ||
            postContentHeight > window.innerHeight - headerHeight
          ) {
            entry.target.classList.add(STICKY_CLASS);
          }
        });
      },
      { threshold: [0.0, 1.0], rootMargin: `-${headerHeight}px 0px 0px 0px` }
    );
  }

  function _clearIntersectionObserver() {
    intersectionObserver?.disconnect();
    intersectionObserver = null;
  }

  api.onAppEvent("topic:current-post-scrolled", _handlePostNodes);

  api.onAppEvent("topic:scrolled", _handleScroll);

  api.onAppEvent("page:topic-loaded", _initIntersectionObserver);

  api.cleanupStream(_clearIntersectionObserver);
});
