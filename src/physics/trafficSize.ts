/**
 * Body size per traffic vehicle shape (task 067): [width, length] in metres, indexed by `TrafficAgent.variant % 5`
 * in the order saloon, hatch, van, taxi, pickup. Collision (roamContact) and the view (trafficShapes) use the same numbers.
 */
export const TRAFFIC_SIZE: readonly (readonly [number, number])[] = [[1.8, 4.4], [1.75, 3.9], [2.0, 5.0], [1.8, 4.4], [1.9, 5.0]];
export const trafficSize = (variant: number): readonly [number, number] => TRAFFIC_SIZE[variant % TRAFFIC_SIZE.length];
