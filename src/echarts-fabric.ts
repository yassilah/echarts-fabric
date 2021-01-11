import * as echarts from 'echarts'

import fabricJS, { fabric as fabricTS } from 'fabric'

import merge from 'lodash.merge'

const fabric = ('fabric' in fabricJS ? fabricJS.fabric : (fabricJS as any)) as typeof fabricTS

const CHART_OPTION = 'option'
const CHART_THEME = 'theme'

const CHART_INSTANCE = '__chart'
const CHART_CANVAS = '__chartCanvas'

const CHART_EVENTS = {
  mousemove: 'mousemove',
  mousedown: 'mousedown',
  mouseout: 'mouseout',
  click: 'mousedown',
  dblclick: 'dblclick',
  mouseup: 'mouseup',
  mouseover: 'mouseover',
}

export class ChartObject extends fabric.Object {
  /**
   * Type of an object (rect, circle, path, etc.).
   * Note that this property is meant to be read-only and not meant to be modified.
   * If you modify, certain parts of Fabric (such as JSON loading) won't work correctly.
   *
   * @type {String}
   * @default
   */
  public static type: string = 'chart'

  /**
   * List of options to pass into the chart.js instance.
   *
   * @type {Object}
   */
  public [CHART_OPTION]: echarts.EChartOption = {}

  /**
   * Theme of the chart.
   *
   * @type {Object}
   */
  public [CHART_THEME]: string | undefined | any

  /**
   * The current chart instance.
   *
   * @type {Chart}
   */
  private [CHART_INSTANCE]?: echarts.ECharts

  /**
   * The current canvas instance for the chart.
   *
   * @type {HTMLCanvasElement}
   */
  private [CHART_CANVAS]: HTMLCanvasElement

  /**
   * Returns an object representation of an instance
   *
   * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
   * @return {Object} Object representation of an instance
   */
  public toObject(propertiesToInclude: string[] = []) {
    return super.toObject(propertiesToInclude.concat(CHART_OPTION, CHART_THEME))
  }

  /**
   * Set the properties of the object.
   *
   * @param {string} key
   * @param {any} value
   */
  public _set(key: string, value: any) {
    super._set(key, value)

    if (key === CHART_OPTION) {
      this[CHART_INSTANCE]?.setOption(value)
    } else if (key === CHART_THEME) {
      this.__createChart()
    }

    return this
  }

  /**
   * Set the chart instance size.
   *
   * @return {void}
   */
  private __setChartSize() {
    this[CHART_INSTANCE]?.resize({ width: this.getScaledWidth(), height: this.getScaledHeight() })
  }

  /**
   * Bind the chart events with the current fabric.Objecct
   * events.
   *
   * @return {void}
   */
  private __bindChartEvents() {
    for (const name in CHART_EVENTS) {
      const event = CHART_EVENTS[name as keyof typeof CHART_EVENTS]

      this.on(event, (e) => {
        if (e.pointer && this.canvas && this[CHART_CANVAS]) {
          let { x, y } = this.toLocalPoint(e.pointer, 'left', 'top')

          if (this.flipX) {
            x = this.getScaledWidth() - x
          }
          if (this.flipY) {
            y = this.getScaledHeight() - y
          }

          this[CHART_CANVAS].dispatchEvent(
            new MouseEvent(name, {
              clientX: x,
              clientY: y,
            })
          )
        }
      })
    }

    this.on('scaling', this.__setChartSize.bind(this))
  }

  /**
   * Ccreate the chart instance.
   *
   * @return {Chart}
   */
  private __createChart() {
    this[CHART_CANVAS] = this[CHART_CANVAS] || document.createElement('canvas')

    this[CHART_INSTANCE] = echarts.init(this[CHART_CANVAS], this[CHART_THEME], {
      width: this.getScaledWidth(),
      height: this.getScaledHeight(),
      devicePixelRatio: this.canvas?.getRetinaScaling(),
    })

    this[CHART_INSTANCE]?.setOption(this[CHART_OPTION])

    this[CHART_INSTANCE]?.on('rendered', () => {
      if (this.canvas) {
        this.dirty = true
        this.canvas.requestRenderAll()
      }
    })

    return this[CHART_INSTANCE]
  }

  /**
   * Initialize the object, create the chart and bind events.
   *
   * @param {fabric.IChartConfiguration} options
   * @return {fabric.Chart}
   */
  public initialize(options: Partial<fabricTS.IChartConfiguration> = {}) {
    options.theme = options.theme || undefined
    super.initialize(options)
    this.__bindChartEvents()
    return this
  }

  /**
   * Execute the drawing operation for an object on a specified context
   *
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  public drawObject(ctx: CanvasRenderingContext2D) {
    this._render(ctx)
  }

  /**
   * function that actually render something on the context.
   * empty here to allow Obects to work on tests to benchmark fabric functionalites
   * not related to rendering
   *
   * @param {CanvasRenderingContext2D} ctx Context to render on
   */
  public _render(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(
      this[CHART_CANVAS],
      -this.width! / 2,
      -this.height! / 2,
      this.width!,
      this.height!
    )
  }

  /**
   * From object.
   *
   * @param object
   * @param callback
   */
  public static fromObject(object: fabricTS.IChartConfiguration, callback: Function) {
    return callback && callback(new fabric.Chart(object))
  }
}

declare module 'fabric' {
  namespace fabric {
    interface Canvas {
      getRetinaScaling(): number
    }
    class Chart extends ChartObject {
      constructor(options?: IChartConfiguration)
    }
    interface IChartConfiguration extends IObjectOptions {
      theme: string | undefined | any
      option: echarts.EChartOption
    }
  }
}

/**
 * Install the plugin on a given fabric instance.
 *
 * @param fabric
 */
export function install(fabricInstance: typeof fabric) {
  fabricInstance.Chart = fabricInstance.util.createClass(ChartObject)
  fabricInstance.Chart.type = ChartObject.type
  fabricInstance.Chart.fromObject = ChartObject.fromObject
}

if (window.fabric) {
  install(window.fabric)
}
