/**
 * Agent 节点统一导出
 */

// Weather Scout
export {
  createWeatherScoutAgent,
  default as weatherScoutAgent,
} from './weather-scout'

// Itinerary Planner
export {
  createItineraryPlannerAgent,
  default as itineraryPlannerAgent,
} from './itinerary-planner'

// Attraction Enricher
export {
  createAttractionEnricherAgent,
  estimateTicketPrice,
  inferOpeningHours,
  inferDuration,
  generateTags,
  default as attractionEnricherAgent,
} from './attraction-enricher'

// Accommodation Specialist
export {
  createAccommodationAgent,
  default as accommodationAgent,
} from './accommodation'

// Transport Logistician
export {
  createTransportAgent,
  default as transportAgent,
} from './transport'

// Dining Recommender
export {
  createDiningAgent,
  default as diningAgent,
} from './dining'

// Budget Critic
export {
  createBudgetCriticAgent,
  default as budgetCriticAgent,
} from './budget-critic'

// Finalize
export {
  createFinalizeAgent,
  default as finalizeAgent,
} from './finalize'
