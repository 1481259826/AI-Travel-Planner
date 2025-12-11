/**
 * 对话 Agent Tools 定义
 * 定义所有可用的工具及其参数
 */

import type { ChatTool } from './types'

/**
 * 所有对话工具列表
 */
export const CHAT_TOOLS: ChatTool[] = [
  // 景点搜索
  {
    type: 'function',
    function: {
      name: 'search_attractions',
      description: '搜索指定城市的景点、旅游地点。可以根据关键词和类型进行筛选。',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称，如"杭州"、"北京"、"上海"',
          },
          keywords: {
            type: 'string',
            description: '搜索关键词，如"西湖"、"古镇"、"博物馆"',
          },
          type: {
            type: 'string',
            enum: ['景点', '美食', '购物', '娱乐', '文化'],
            description: '景点类型',
          },
          limit: {
            type: 'number',
            description: '返回结果数量限制，默认为 10',
          },
        },
        required: ['city'],
      },
    },
  },

  // 酒店搜索
  {
    type: 'function',
    function: {
      name: 'search_hotels',
      description: '搜索指定城市的酒店住宿。可以根据价格区间和类型筛选。',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称',
          },
          price_range: {
            type: 'string',
            enum: ['budget', 'mid', 'luxury'],
            description: '价格区间：budget（经济型，<300元）、mid（中档，300-800元）、luxury（豪华，>800元）',
          },
          type: {
            type: 'string',
            enum: ['hotel', 'hostel', 'apartment', 'resort'],
            description: '住宿类型：酒店、青旅、公寓、度假村',
          },
          limit: {
            type: 'number',
            description: '返回结果数量限制',
          },
        },
        required: ['city'],
      },
    },
  },

  // 餐厅搜索
  {
    type: 'function',
    function: {
      name: 'search_restaurants',
      description: '搜索指定城市的餐厅。可以根据菜系和价格区间筛选。',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称',
          },
          cuisine: {
            type: 'string',
            description: '菜系，如"杭帮菜"、"川菜"、"日料"、"西餐"',
          },
          price_range: {
            type: 'string',
            enum: ['budget', 'mid', 'high'],
            description: '价格区间：budget（人均<50元）、mid（50-150元）、high（>150元）',
          },
          limit: {
            type: 'number',
            description: '返回结果数量限制',
          },
        },
        required: ['city'],
      },
    },
  },

  // 天气查询
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取指定城市的天气预报信息。',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称',
          },
          date: {
            type: 'string',
            description: '查询日期，格式 YYYY-MM-DD。不提供则查询未来几天的天气。',
          },
        },
        required: ['city'],
      },
    },
  },

  // 行程修改
  {
    type: 'function',
    function: {
      name: 'modify_itinerary',
      description: '修改已有的行程安排，如添加/删除景点、调整时间顺序等。',
      parameters: {
        type: 'object',
        properties: {
          trip_id: {
            type: 'string',
            description: '行程 ID',
          },
          operation: {
            type: 'string',
            enum: [
              'add_attraction',    // 添加景点
              'remove_attraction', // 删除景点
              'reorder',           // 调整顺序
              'change_time',       // 修改时间
              'add_day',           // 增加一天
              'remove_day',        // 删除一天
              'change_hotel',      // 更换酒店
              'change_restaurant', // 更换餐厅
            ],
            description: '操作类型',
          },
          params: {
            type: 'object',
            description: '操作参数，根据 operation 不同而变化',
            properties: {
              day_index: {
                type: 'number',
                description: '天数索引（从 0 开始）',
              },
              activity_index: {
                type: 'number',
                description: '活动索引（从 0 开始）',
              },
              attraction_name: {
                type: 'string',
                description: '景点名称（添加景点时使用）',
              },
              new_time: {
                type: 'string',
                description: '新时间（修改时间时使用），如 "09:00"',
              },
              from_day: {
                type: 'number',
                description: '源天数索引（调整顺序时使用）',
              },
              from_index: {
                type: 'number',
                description: '源活动索引（调整顺序时使用）',
              },
              to_day: {
                type: 'number',
                description: '目标天数索引（调整顺序时使用）',
              },
              to_index: {
                type: 'number',
                description: '目标活动索引（调整顺序时使用）',
              },
            },
          },
        },
        required: ['trip_id', 'operation', 'params'],
      },
    },
  },

  // 获取行程详情
  {
    type: 'function',
    function: {
      name: 'get_trip_details',
      description: '获取行程的详细信息，包括每天的行程安排、住宿、交通等。',
      parameters: {
        type: 'object',
        properties: {
          trip_id: {
            type: 'string',
            description: '行程 ID',
          },
        },
        required: ['trip_id'],
      },
    },
  },

  // 准备行程表单（对话式创建行程 - 第一步）
  {
    type: 'function',
    function: {
      name: 'prepare_trip_form',
      description: `准备旅行规划表单。从对话中提取用户的旅行信息，生成表单预览供用户确认。

当用户表达想要创建/规划/安排行程的意图时调用此工具。
工具会：
1. 提取用户提供的信息（目的地、日期、预算等）
2. 验证必填字段是否完整
3. 生成表单预览卡片

如果有必填信息缺失，应在对话中询问用户补充后再次调用此工具。`,
      parameters: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            description: '目的地城市，如"杭州"、"北京"',
          },
          start_date: {
            type: 'string',
            description: '开始日期，格式 YYYY-MM-DD',
          },
          end_date: {
            type: 'string',
            description: '结束日期，格式 YYYY-MM-DD',
          },
          budget: {
            type: 'number',
            description: '预算金额（元）',
          },
          travelers: {
            type: 'number',
            description: '出行人数，默认为 1',
          },
          origin: {
            type: 'string',
            description: '出发地城市（可选）',
          },
          preferences: {
            type: 'array',
            items: { type: 'string', description: '偏好项' },
            description: '旅行偏好，如["美食","文化古迹","自然风光","购物","亲子"]',
          },
          accommodation_preference: {
            type: 'string',
            enum: ['budget', 'mid', 'luxury'],
            description: '住宿偏好：budget(经济型)、mid(舒适型)、luxury(豪华型)',
          },
          transport_preference: {
            type: 'string',
            enum: ['public', 'driving', 'mixed'],
            description: '交通偏好：public(公共交通)、driving(自驾)、mixed(混合)',
          },
          special_requirements: {
            type: 'string',
            description: '特殊要求或备注',
          },
        },
        required: [], // 不强制要求任何字段，让 AI 灵活提取
      },
    },
  },

  // 确认并生成行程（对话式创建行程 - 第二步）
  {
    type: 'function',
    function: {
      name: 'confirm_and_generate_trip',
      description: `确认表单数据并开始生成行程。

仅在以下情况调用此工具：
1. 用户已确认表单信息无误
2. 用户点击了"确认生成"按钮
3. 所有必填字段都已填写

此工具会触发 LangGraph 工作流，开始多智能体协作生成详细行程。`,
      parameters: {
        type: 'object',
        properties: {
          form_data: {
            type: 'object',
            description: '完整的表单数据',
            properties: {
              destination: { type: 'string', description: '目的地' },
              start_date: { type: 'string', description: '开始日期' },
              end_date: { type: 'string', description: '结束日期' },
              budget: { type: 'number', description: '预算' },
              travelers: { type: 'number', description: '人数' },
              origin: { type: 'string', description: '出发地' },
              preferences: { type: 'array', items: { type: 'string', description: '偏好项' }, description: '偏好' },
              accommodation_preference: { type: 'string', description: '住宿偏好' },
              transport_preference: { type: 'string', description: '交通偏好' },
              special_requirements: { type: 'string', description: '特殊要求' },
            },
            required: ['destination', 'start_date', 'end_date', 'budget', 'travelers'],
          },
          session_id: {
            type: 'string',
            description: '当前对话会话 ID',
          },
        },
        required: ['form_data'],
      },
    },
  },

  // 创建行程（旧版兼容，已弃用）
  {
    type: 'function',
    function: {
      name: 'create_trip',
      description: '[已弃用] 请使用 prepare_trip_form 和 confirm_and_generate_trip 代替。',
      parameters: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            description: '目的地城市',
          },
          start_date: {
            type: 'string',
            description: '开始日期，格式 YYYY-MM-DD',
          },
          end_date: {
            type: 'string',
            description: '结束日期，格式 YYYY-MM-DD',
          },
          budget: {
            type: 'number',
            description: '预算（元）',
          },
          travelers: {
            type: 'number',
            description: '出行人数',
          },
          preferences: {
            type: 'array',
            items: { type: 'string', description: '偏好项' },
            description: '旅行偏好，如["美食","文化古迹","自然风光"]',
          },
        },
        required: ['destination', 'start_date', 'end_date', 'budget', 'travelers'],
      },
    },
  },

  // 计算路线
  {
    type: 'function',
    function: {
      name: 'calculate_route',
      description: '计算两地之间的路线，支持驾车、公交、步行等多种交通方式。',
      parameters: {
        type: 'object',
        properties: {
          origin: {
            type: 'string',
            description: '出发地，可以是地名或地址',
          },
          destination: {
            type: 'string',
            description: '目的地，可以是地名或地址',
          },
          mode: {
            type: 'string',
            enum: ['driving', 'transit', 'walking'],
            description: '交通方式：driving（驾车）、transit（公交）、walking（步行）',
          },
        },
        required: ['origin', 'destination'],
      },
    },
  },

  // 获取推荐
  {
    type: 'function',
    function: {
      name: 'get_recommendations',
      description: '获取旅行推荐，包括热门景点、特色餐厅、优质酒店等。',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称',
          },
          category: {
            type: 'string',
            enum: ['attractions', 'restaurants', 'hotels', 'activities'],
            description: '推荐类别：景点、餐厅、酒店、活动',
          },
          preferences: {
            type: 'array',
            items: { type: 'string', description: '偏好项' },
            description: '用户偏好，如["亲子","文化"]',
          },
          limit: {
            type: 'number',
            description: '返回结果数量限制',
          },
        },
        required: ['city', 'category'],
      },
    },
  },

  // 准备行程修改（带预览确认）
  {
    type: 'function',
    function: {
      name: 'prepare_itinerary_modification',
      description: `准备行程修改预览。分析修改影响，生成前后对比，等待用户确认后才保存。

支持的操作类型：
- 基础修改：add_attraction, remove_attraction, reorder, change_time, change_hotel, change_restaurant
- 结构变更：add_day, remove_day, split_day, merge_days
- 智能重规划：optimize_route, replan_day, adjust_for_weather
- 重生成：regenerate_day, regenerate_trip_segment

使用场景：
- 用户说"删除第二天的西湖" → operation: remove_attraction
- 用户说"把灵隐寺移到上午" → operation: change_time
- 用户说"帮我优化一下路线" → operation: optimize_route
- 用户说"博物馆闭馆了重新规划" → operation: replan_day

注意：此工具只生成预览，不会立即保存。用户需要确认后才会执行修改。`,
      parameters: {
        type: 'object',
        properties: {
          trip_id: {
            type: 'string',
            description: '要修改的行程 ID',
          },
          operation: {
            type: 'string',
            enum: [
              'add_attraction', 'remove_attraction', 'reorder', 'change_time',
              'change_hotel', 'change_restaurant',
              'add_day', 'remove_day', 'split_day', 'merge_days',
              'optimize_route', 'replan_day', 'adjust_for_weather',
              'regenerate_day', 'regenerate_trip_segment',
            ],
            description: '操作类型',
          },
          params: {
            type: 'object',
            description: '操作参数',
            properties: {
              day_index: { type: 'number', description: '天数索引（从 0 开始）' },
              activity_index: { type: 'number', description: '活动索引' },
              meal_index: { type: 'number', description: '餐食索引（用于 change_restaurant）' },
              attraction: {
                type: 'object',
                description: '新增景点信息',
                properties: {
                  name: { type: 'string', description: '景点名称' },
                  location: { type: 'string', description: '景点位置' },
                  duration: { type: 'string', description: '游玩时长' },
                  preferred_time: { type: 'string', description: '偏好时间段' },
                  ticket_price: { type: 'number', description: '门票价格（元）' },
                  description: { type: 'string', description: '景点描述' },
                },
              },
              hotel: {
                type: 'object',
                description: '新酒店信息（用于 change_hotel）',
                properties: {
                  name: { type: 'string', description: '酒店名称' },
                  type: { type: 'string', description: '酒店类型，如 经济型、舒适型、豪华型' },
                  price_per_night: { type: 'number', description: '每晚价格' },
                  description: { type: 'string', description: '酒店描述' },
                },
                required: ['name'],
              },
              restaurant: {
                type: 'object',
                description: '新餐厅信息（用于 change_restaurant）',
                properties: {
                  name: { type: 'string', description: '餐厅名称' },
                  cuisine: { type: 'string', description: '菜系类型' },
                  avg_price: { type: 'number', description: '人均消费' },
                  recommended_dishes: { type: 'array', items: { type: 'string', description: '菜品名称' }, description: '推荐菜品' },
                },
                required: ['name'],
              },
              new_time: { type: 'string', description: '新时间，如 "09:00"' },
              from_day: { type: 'number', description: '源天数索引' },
              from_index: { type: 'number', description: '源活动索引' },
              to_day: { type: 'number', description: '目标天数索引' },
              to_index: { type: 'number', description: '目标活动索引' },
              regeneration_hints: {
                type: 'object',
                description: '重生成提示',
                properties: {
                  keep_attractions: { type: 'array', items: { type: 'string', description: '景点名称' }, description: '保留的景点' },
                  exclude_attractions: { type: 'array', items: { type: 'string', description: '景点名称' }, description: '排除的景点' },
                  preferences: { type: 'array', items: { type: 'string', description: '偏好' }, description: '新偏好' },
                },
              },
              day_range: {
                type: 'object',
                description: '天数范围',
                properties: {
                  start_day: { type: 'number', description: '起始天' },
                  end_day: { type: 'number', description: '结束天' },
                },
              },
            },
          },
          reason: {
            type: 'string',
            description: '用户说明的修改原因（用于 AI 上下文理解）',
          },
        },
        required: ['trip_id', 'operation', 'params'],
      },
    },
  },

  // 确认行程修改
  {
    type: 'function',
    function: {
      name: 'confirm_itinerary_modification',
      description: `确认并应用行程修改。

仅在以下情况调用此工具：
1. 用户明确确认要执行修改
2. 用户点击了"确认修改"按钮

此工具会将 prepare_itinerary_modification 生成的预览修改保存到数据库。`,
      parameters: {
        type: 'object',
        properties: {
          modification_id: {
            type: 'string',
            description: '修改预览 ID（由 prepare_itinerary_modification 返回）',
          },
          user_adjustments: {
            type: 'object',
            description: '用户在确认前的微调（可选）',
            properties: {
              time_adjustments: {
                type: 'array',
                description: '时间调整列表',
                items: {
                  type: 'object',
                  description: '单个时间调整项',
                  properties: {
                    day_index: { type: 'number', description: '天数索引' },
                    activity_index: { type: 'number', description: '活动索引' },
                    new_time: { type: 'string', description: '新时间' },
                  },
                },
              },
            },
          },
        },
        required: ['modification_id'],
      },
    },
  },

  // 取消行程修改
  {
    type: 'function',
    function: {
      name: 'cancel_itinerary_modification',
      description: `取消待确认的行程修改。

当用户明确表示不想执行修改时调用此工具。`,
      parameters: {
        type: 'object',
        properties: {
          modification_id: {
            type: 'string',
            description: '要取消的修改预览 ID',
          },
        },
        required: ['modification_id'],
      },
    },
  },
]

/**
 * 工具名称到描述的映射
 */
export const TOOL_DESCRIPTIONS: Record<string, string> = {
  search_attractions: '搜索景点',
  search_hotels: '搜索酒店',
  search_restaurants: '搜索餐厅',
  get_weather: '查询天气',
  modify_itinerary: '修改行程',
  get_trip_details: '获取行程详情',
  create_trip: '创建行程',
  prepare_trip_form: '准备行程表单',
  confirm_and_generate_trip: '生成行程',
  calculate_route: '计算路线',
  get_recommendations: '获取推荐',
  prepare_itinerary_modification: '准备修改预览',
  confirm_itinerary_modification: '确认修改',
  cancel_itinerary_modification: '取消修改',
}

/**
 * 工具名称到图标的映射
 */
export const TOOL_ICONS: Record<string, string> = {
  search_attractions: '🏛️',
  search_hotels: '🏨',
  search_restaurants: '🍽️',
  get_weather: '🌤️',
  modify_itinerary: '✏️',
  get_trip_details: '📋',
  create_trip: '✈️',
  prepare_trip_form: '📝',
  confirm_and_generate_trip: '🚀',
  calculate_route: '🗺️',
  get_recommendations: '⭐',
  prepare_itinerary_modification: '👀',
  confirm_itinerary_modification: '✅',
  cancel_itinerary_modification: '❌',
}

/**
 * 获取工具的友好描述
 */
export function getToolDescription(toolName: string): string {
  return TOOL_DESCRIPTIONS[toolName] || toolName
}

/**
 * 获取工具的图标
 */
export function getToolIcon(toolName: string): string {
  return TOOL_ICONS[toolName] || '🔧'
}

/**
 * 获取 OpenAI 格式的工具定义
 * 用于 API 调用
 */
export function getOpenAITools() {
  return CHAT_TOOLS.map((tool) => ({
    type: tool.type,
    function: tool.function,
  }))
}
