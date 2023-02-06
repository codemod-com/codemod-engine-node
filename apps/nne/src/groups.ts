import * as t from 'io-ts';

export const oldGroupCodec = t.union([
	t.literal('nextJs'),
	t.literal('mui'),
	t.literal('reactrouterv4'),
	t.literal('reactrouterv6'),
	t.literal('immutablejsv4'),
	t.literal('immutablejsv0'),
]);

export const newGroupCodec = t.union([
	t.literal('immutable_0'),
	t.literal('immutable_4'),
	t.literal('next_13'),
	t.literal('next_13_composite'),
	t.literal('react-router_4'),
	t.literal('react-router_6'),
	t.literal('redwoodjs_core_4'),
	t.literal('mui'),
]);

export type NewGroup = t.TypeOf<typeof newGroupCodec>;
