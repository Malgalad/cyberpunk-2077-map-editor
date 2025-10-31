import * as z from "zod";

export const ProjectStateSchema = z.object({
  name: z.string(),
  mode: z.union([
    z.literal("create"),
    z.literal("update"),
    z.literal("delete"),
  ]),
  tool: z.union([
    z.literal("move"),
    z.literal("select"),
    z.literal("multiselect"),
  ]),
  version: z.number(),
});

export const OptionsStateSchema = z.object({
  districtView: z.union([
    z.literal("all"),
    z.literal("current"),
    z.literal("custom"),
  ]),
  patternView: z.union([
    z.literal("none"),
    z.literal("wireframe"),
    z.literal("solid"),
  ]),
  visibleDistricts: z.array(z.string()),
});

const DistrictDataSchema = z.intersection(
  z.object({
    name: z.string(),
    position: z.array(z.number()),
    orientation: z.array(z.number()),
    transMin: z.array(z.number()),
    transMax: z.array(z.number()),
    cubeSize: z.number(),
  }),
  z.discriminatedUnion("isCustom", [
    z.object({
      isCustom: z.literal(true),
    }),
    z.object({
      isCustom: z.literal(false),
      texture: z.string(),
    }),
  ]),
);

export const PersistentDistrictStateSchema = z.object({
  districts: z.array(DistrictDataSchema),
  current: z.union([z.string(), z.null()]),
});

export const NodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.union([z.literal("group"), z.literal("instance")]),
  tag: z.union([z.literal("create"), z.literal("update"), z.literal("delete")]),
  parent: z.string(),
  virtual: z.boolean().optional(),
  position: z.tuple([z.string(), z.string(), z.string()]),
  rotation: z.tuple([z.string(), z.string(), z.string()]),
  scale: z.tuple([z.string(), z.string(), z.string()]),
  pattern: z
    .object({
      enabled: z.boolean(),
      count: z.number(),
      position: z.tuple([z.string(), z.string(), z.string()]),
      rotation: z.tuple([z.string(), z.string(), z.string()]),
      scale: z.tuple([z.string(), z.string(), z.string()]),
    })
    .optional(),
});
export const NodesStateSchema = z.object({
  nodes: z.array(NodeSchema),
  editingId: z.union([z.string(), z.null()]),
});

export const PersistentStateSchema = z.object({
  project: ProjectStateSchema,
  options: OptionsStateSchema,
  district: PersistentDistrictStateSchema,
  nodes: NodesStateSchema,
});
