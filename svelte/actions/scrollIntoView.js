export function scrollIntoView(node) {
  node.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "center",
  });
}
