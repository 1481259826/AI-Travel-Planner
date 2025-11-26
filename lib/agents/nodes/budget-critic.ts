/**
 * Budget Critic Agent 节点
 * 预算审计 Agent - 汇总成本并判断是否通过
 */

import type {
  TripState,
  TripStateUpdate,
  BudgetResult,
  BudgetFeedback,
  BudgetFeedbackAction,
} from '../state'

/**
 * 创建 Budget Critic Agent
 */
export function createBudgetCriticAgent() {
  /**
   * Budget Critic Agent 节点函数
   */
  return async function budgetCriticAgent(
    state: TripState
  ): Promise<TripStateUpdate> {
    console.log('[Budget Critic] Starting budget audit...')

    const {
      userInput,
      accommodation,
      transport,
      dining,
      draftItinerary,
      retryCount,
    } = state

    // 1. 汇总各项成本
    const accommodationCost = accommodation?.totalCost || 0
    const transportCost = transport?.totalCost || 0
    const diningCost = dining?.totalCost || 0
    const attractionCost = draftItinerary?.estimatedAttractionCost || 0

    const totalCost =
      accommodationCost + transportCost + diningCost + attractionCost

    // 2. 计算预算利用率
    const budgetUtilization = totalCost / userInput.budget

    // 3. 判断是否在预算内
    // 允许的溢价比例随重试次数增加
    const allowedOverage = 1.1 + retryCount * 0.05 // 10% + 5% per retry
    const isWithinBudget = totalCost <= userInput.budget * allowedOverage

    console.log(`[Budget Critic] Total: ¥${totalCost}, Budget: ¥${userInput.budget}`)
    console.log(`[Budget Critic] Utilization: ${(budgetUtilization * 100).toFixed(1)}%`)
    console.log(`[Budget Critic] Allowed overage: ${((allowedOverage - 1) * 100).toFixed(0)}%`)
    console.log(`[Budget Critic] Within budget: ${isWithinBudget}`)

    // 4. 生成反馈（如果超预算）
    let feedback: BudgetFeedback | undefined

    if (!isWithinBudget) {
      const overageAmount = totalCost - userInput.budget

      // 分析各项成本占比，确定削减策略
      const costBreakdown = {
        accommodation: accommodationCost,
        transport: transportCost,
        dining: diningCost,
        attractions: attractionCost,
      }

      // 找出占比最高的可调整项
      const adjustableItems: Array<{
        action: BudgetFeedbackAction
        cost: number
        suggestion: string
      }> = [
        {
          action: 'downgrade_hotel',
          cost: accommodationCost,
          suggestion: '建议选择更经济的住宿，可节省约 20-30%',
        },
        {
          action: 'adjust_meals',
          cost: diningCost,
          suggestion: '建议调整部分用餐选择，选择更实惠的餐厅',
        },
        {
          action: 'cheaper_transport',
          cost: transportCost,
          suggestion: '建议多使用公共交通替代打车',
        },
        {
          action: 'reduce_attractions',
          cost: attractionCost,
          suggestion: '建议减少付费景点，增加免费景点',
        },
      ]

      // 按成本排序，选择削减空间最大的
      adjustableItems.sort((a, b) => b.cost - a.cost)

      // 选择最合适的削减策略
      let selectedAction = adjustableItems[0]

      // 如果是重试，尝试不同的策略
      if (retryCount > 0 && retryCount < adjustableItems.length) {
        selectedAction = adjustableItems[retryCount]
      }

      feedback = {
        action: selectedAction.action,
        targetReduction: overageAmount,
        suggestion: selectedAction.suggestion,
      }

      console.log(`[Budget Critic] Feedback: ${selectedAction.action}`)
      console.log(`[Budget Critic] Target reduction: ¥${overageAmount}`)
    }

    // 5. 构建审计结果
    const budgetResult: BudgetResult = {
      totalCost,
      budgetUtilization,
      isWithinBudget,
      costBreakdown: {
        accommodation: accommodationCost,
        transport: transportCost,
        dining: diningCost,
        attractions: attractionCost,
      },
      feedback,
    }

    console.log('[Budget Critic] Audit completed')

    return {
      budgetResult,
      // 如果超预算，触发 retryCount 累加
      retryCount: isWithinBudget ? 0 : 1,
    }
  }
}

/**
 * 默认导出
 */
export default createBudgetCriticAgent
