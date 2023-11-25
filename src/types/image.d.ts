declare namespace TImage {
  type quality = 'low' | 'medium' | 'high'

  interface BackgroundImageItem {
    appearanceCode: number
    file: File
    smallBase64: string
  }

  interface BaseImageItem {
    name: string
    desc: string
  }

  interface BingImageItem {
    bot: number
    copyright: string //  "汉密尔顿山顶的利克天文台，美国加利福尼亚州 (© Jeffrey Lewis/Tandem Stills + Motion)"
    copyrightlink: string // "https://www.bing.com/search?q=%E5%88%A9%E5%85%8B%E5%A4%A9%E6%96%87%E5%8F%B0&form=hpcapt&mkt=zh-cn"
    drk: number
    enddate: string // "20220103"
    fullstartdate: string // "202201021600"
    hs: any[]
    hsh: string // "c1b40e3cedfe095004365a5d610cdd95"
    quiz: string // "/search?q=Bing+homepage+quiz&filters=WQOskey:%22HPQuiz_20220102_LickObservatory%22&FORM=HPQUIZ"
    startdate: string // "20220102"
    title: string // ""
    top: number
    url: string // "/th?id=OHR.LickObservatory_ZH-CN9676762110_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=hp"
    urlbase: string // "/th?id=OHR.LickObservatory_ZH-CN9676762110"
    wp: boolean
  }

  interface PexelsImageItem {
    id: number // 19161138
    width: number // 6240
    height: number // 4160
    url: string // "https://www.pexels.com/photo/lonely-chapel-19161138/"
    photographer: string // "Caleb Owens"
    photographer_url: string // "https://www.pexels.com/@calebowensphoto"
    photographer_id: number // 803094799
    avg_color: string // "#729DBD"
    src: {
      original: string // "https://images.pexels.com/photos/19161138/pexels-photo-19161138.jpeg"
      large2x: string // "https://images.pexels.com/photos/19161138/pexels-photo-19161138.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      large: string // "https://images.pexels.com/photos/19161138/pexels-photo-19161138.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
      medium: string // "https://images.pexels.com/photos/19161138/pexels-photo-19161138.jpeg?auto=compress&cs=tinysrgb&h=350"
      small: string // "https://images.pexels.com/photos/19161138/pexels-photo-19161138.jpeg?auto=compress&cs=tinysrgb&h=130"
      portrait: string // "https://images.pexels.com/photos/19161138/pexels-photo-19161138.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800"
      landscape: string // "https://images.pexels.com/photos/19161138/pexels-photo-19161138.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200"
      tiny: string // "https://images.pexels.com/photos/19161138/pexels-photo-19161138.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=200&w=280"
    }
    liked: boolean // false
    alt: string // "Lonely Chapel "
  }
}
