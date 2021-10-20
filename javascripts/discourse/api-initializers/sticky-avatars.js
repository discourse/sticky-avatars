import { apiInitializer } from "discourse/lib/api";
import { schedule } from "@ember/runloop";
import Site from "discourse/models/site";

export default apiInitializer("0.11.1", (api) => {
  if (Site.currentProp("mobileView")) {
    return;
  }

  let intersectionObserver;
  let mutationObserver;

  let direction = "⬇️";
  let prevYPosition = -1;
  const handleScrollPosition = () => {
    if (window.scrollY > prevYPosition) {
      direction = "⬇️";
    } else {
      direction = "⬆️";
    }

    prevYPosition = window.scrollY;

    if (window.scrollY <= 0) {
      document
        .querySelectorAll("#topic .post-stream .topic-post.sticky-avatar")
        .forEach((postNode) => {
          postNode.classList.remove("sticky-avatar");
        });
    }
  };

  api.onAppEvent("page:topic-loaded", () => {
    schedule("afterRender", () => {
      document.addEventListener("scroll", handleScrollPosition);

      const headerHeight =
        document.querySelector(".d-header")?.clientHeight || 0;

      intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting || entry.intersectionRatio === 1) {
              entry.target.classList.remove("sticky-avatar");
              return;
            }

            const postContentHeight = entry.target.querySelector(".contents")
              ?.clientHeight;

            if (
              direction === "⬆️" ||
              postContentHeight > window.innerHeight - headerHeight
            ) {
              entry.target.classList.add("sticky-avatar");
            }
          });
        },
        { threshold: [0.0, 1.0], rootMargin: `-${headerHeight}px 0px 0px 0px` }
      );

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
    document.removeEventListener("scroll", handleScrollPosition);

    intersectionObserver?.disconnect();
    intersectionObserver = null;

    mutationObserver?.disconnect();
    mutationObserver = null;
  });
});
