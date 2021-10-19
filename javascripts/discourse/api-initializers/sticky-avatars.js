import { apiInitializer } from "discourse/lib/api";
import { schedule } from "@ember/runloop";
import Site from "discourse/models/site";

const LARGE_POST_HEIGHT_THRESHOLD = window.innerHeight;

export default apiInitializer("0.11.1", (api) => {
  if (Site.currentProp("mobileView")) {
    return;
  }

  let intersectionObserver;
  let mutationObserver;

  api.onAppEvent("page:topic-loaded", () => {
    schedule("afterRender", () => {
      intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            entry.target.classList.remove("sticky-avatar");
            return;
          }

          const headerHeight =
            document.querySelector(".d-header")?.clientHeight || 0;
          const postHeight = entry.target.clientHeight;
          const postContentHeight =
            entry.target.querySelector(".contents")?.clientHeight || 0;
          const postViewportHeight =
            window.innerHeight -
            headerHeight -
            (postHeight - postContentHeight);

          const isScrollingUpward =
            entry.boundingClientRect.y < entry.rootBounds.y;
          if (isScrollingUpward || postViewportHeight <= postContentHeight) {
            entry.target.classList.add("sticky-avatar");
          }
        });
      });

      document
        .querySelectorAll("#topic .post-stream .topic-post")
        .forEach((postNode) => {
          intersectionObserver.observe(postNode);
        });

      mutationObserver = new MutationObserver(function (mutationsList) {
        mutationsList.forEach((mutation) => {
          mutation.addedNodes.forEach((addedPostNode) => {
            if (addedPostNode.classList.contains("topic-post")) {
              intersectionObserver.observe(addedPostNode);
            }
          });
        });
      });

      mutationObserver.observe(document.querySelector("#topic .post-stream"), {
        childList: true,
        subtree: false,
        attributes: false,
      });
    });
  });

  api.cleanupStream(() => {
    intersectionObserver?.disconnect();
    intersectionObserver = null;

    mutationObserver?.disconnect();
    mutationObserver = null;
  });
});
