# Validation

`validateConnection(graph, candidate, rule?)` checks that both nodes and connectors exist, the source is an output and the target is an input, self-connections are absent, the supplied compatibility rule accepts the pair, and `one` cardinality is respected. A rule returns `true`, `false`, or a message string. Type keys have no built-in meaning.

`validateGraph(graph, rule?)` returns issues with an element ID, element kind, and human-readable message. `GraphEditor` uses the optional `validateConnection` prop for interactive connections and shows rejection feedback on the canvas. Connectors with invalid existing connections are marked for review.
