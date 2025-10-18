import * as z from "zod";

export const ProjectSchema = z.object({
  name: z.string(),
  version: z.number(),
});

export const OptionsSchema = z.object({
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

export const DistrictDataSchema = z.intersection(
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

export const NodeSchemaV1 = z.object({
  id: z.string(),
  label: z.string(),
  type: z.union([z.literal("group"), z.literal("instance")]),
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

export const PersistentStateV1Schema = z.record(
  z.string(),
  z.object({
    district: DistrictDataSchema,
    nodes: z.array(NodeSchemaV1),
    removals: z.array(z.number()),
  }),
);

export const PersistentStateV2Schema = z.object({
  project: ProjectSchema,
  options: OptionsSchema,
  district: z.object({
    districts: z.array(DistrictDataSchema),
    current: z.union([z.string(), z.undefined()]),
  }),
  nodes: z.object({
    nodes: z.array(NodeSchemaV1),
    removals: z.array(z.number()),
    editingId: z.union([z.string(), z.undefined()]),
  }),
});
