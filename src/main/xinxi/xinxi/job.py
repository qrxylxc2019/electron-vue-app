import json
from typing import Dict, AsyncGenerator
from fastapi import HTTPException
import requests
from datetime import datetime
import asyncio
import time
import urllib3

# 禁用SSL警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class JobScraper:
    def __init__(self):
        self.api_url = "https://gp-api.iguopin.com/api/jobs/v1/list"
        self.base_url = "https://www.iguopin.com"
        self.headers = {
            "accept": "application/json, text/plain, */*",
            "accept-language": "zh-CN,zh;q=0.9",
            "content-type": "application/json;charset=UTF-8",
            "device": "pc",
            "priority": "u=1, i",
            "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "subsite": "cujiuye",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
        }
        self.payload = {
            "page": 1,
            "page_size": 20,
            "district": ["000000.440000.440100"],  # 广州地区
            "nature": ["113Fc6wc"],  # 国企
            "education": ["116yhC4D"]  # 本科
        }

    async def fetch_data(self, page: int = 1) -> Dict:
        """获取数据"""
        try:
            # 设置页码
            self.payload["page"] = page
            
            # 使用requests库发送POST请求，禁用SSL验证
            response = requests.post(
                self.api_url, 
                headers=self.headers,
                json=self.payload,
                verify=False,
                timeout=30
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="API请求失败")
            
            # 解析响应数据
            data = response.json()
            
            return data
            
        except Exception as e:
            print(f"Error fetching data: {str(e)}")
            raise HTTPException(status_code=500, detail=f"获取数据失败: {str(e)}")

    async def stream_search_results(self, limit: int = 1000) -> AsyncGenerator[Dict, None]:
        """流式输出搜索结果"""
        try:
            page = 1
            count = 0
            has_more_data = True
            
            while has_more_data and page <= 10:  # 最多获取10页数据，防止无限循环
                print(f"开始爬取第{page}页数据")
                # 获取当前页数据
                data = await self.fetch_data(page)
                job_list = data.get("data", {}).get("list", [])
                
                # 如果没有数据，退出循环
                if not job_list:
                    print(f"第{page}页没有数据，停止爬取")
                    has_more_data = False
                    break
                
                for job in job_list:
                    if count >= limit:
                        has_more_data = False  # 达到限制数量，停止获取更多页
                        break
                        
                    job_info = {}
                    
                    job_info['title'] = job.get('job_name', '')
                    
                    keywords = ['开发', '软件', '网络', '运维', '前端', '后端', 'java', 'vue', '全栈']
                    title = job_info['title'].lower()
                    
                    if not any(keyword.lower() in title for keyword in keywords):
                        continue
                    
                    # 薪资
                    if job.get('is_negotiable', False):
                        job_info['salary'] = '面议'
                    elif job.get('min_wage') and job.get('max_wage'):
                        min_wage = job.get('min_wage', 0) / 1000
                        max_wage = job.get('max_wage', 0) / 1000
                        if min_wage == max_wage:
                            job_info['salary'] = f"{int(min_wage)}K"
                        else:
                            job_info['salary'] = f"{int(min_wage)}~{int(max_wage)}K"
                    else:
                        job_info['salary'] = '面议'
                    
                    # 地区
                    district_list = job.get('district_list', [])
                    if district_list:
                        district = district_list[0].get('area_cn', '')
                        job_info['district'] = f"「{district}」" if district else ''
                    else:
                        job_info['district'] = ''
                    
                    # 公司名称
                    job_info['company'] = job.get('company_name', '')
                    
                    # 链接 - 构建完整链接
                    job_id = job.get('job_id', '')
                    if job_id:
                        job_info['link'] = f"{self.base_url}/job/detail?id={job_id}"
                    else:
                        job_info['link'] = self.base_url
                    
                    # 日期 - 尝试从刷新时间或创建时间中获取
                    refresh_time = job.get('refresh_time', '')
                    create_time = job.get('create_time', '')
                    if refresh_time:
                        try:
                            # 格式化时间字符串
                            publish_date = datetime.strptime(refresh_time, '%Y-%m-%d %H:%M:%S').strftime('%Y-%m-%d')
                            job_info['date'] = publish_date
                        except:
                            job_info['date'] = datetime.now().strftime('%Y-%m-%d')
                    elif create_time:
                        try:
                            # 格式化时间字符串
                            publish_date = datetime.strptime(create_time, '%Y-%m-%d %H:%M:%S').strftime('%Y-%m-%d')
                            job_info['date'] = publish_date
                        except:
                            job_info['date'] = datetime.now().strftime('%Y-%m-%d')
                    else:
                        job_info['date'] = datetime.now().strftime('%Y-%m-%d')
                    
                    # 来源信息
                    job_info['source'] = '国聘'
                    
                    # ID信息
                    job_info['id'] = job_id
                    
                    # 工作经验
                    job_info['experience'] = job.get('experience_cn', '')
                    
                    # 学历
                    job_info['education'] = job.get('education_cn', '')
                    
                    # 职位类别
                    job_info['category'] = job.get('category_cn', '')
                    
                    # 添加元数据
                    job_info["source_name"] = "国聘网-国企招聘"
                    job_info["type"] = "source"

                    print("数据job_info:", job_info)
                    
                    # 流式输出每个职位
                    yield job_info
                    count += 1
                    
                    # 短暂延迟，避免请求过快
                    await asyncio.sleep(0.2)
                
                # 如果已经达到限制数量，跳出页面循环
                if not has_more_data:
                    break
                    
                # 继续下一页
                print(f"完成第{page}页数据爬取，共获取{len(job_list)}条，继续爬取下一页")
                page += 1
                
                # 每页爬取后短暂休息，避免请求过快被封IP
                await asyncio.sleep(1)
                
        except Exception as e:
            error_data = {
                "type": "error",
                "message": f"获取数据出错: {str(e)}",
                "source": "job"
            }
            yield error_data
        
async def get_zhaopin_data(limit: int = 10):
    """获取招聘数据的主函数"""
    scraper = JobScraper()
    
    async for data in scraper.stream_search_results(limit):
        if data.get("type") == "source":
            yield data

# 为了与其他爬虫保持一致
async def get_data(limit: int = 10):
    async for item in get_zhaopin_data(limit=limit):
        yield item

if __name__ == "__main__":
    async def test_scraper():
        scraper = JobScraper()
        async for item in scraper.stream_search_results(limit=10):
            print("获取到数据:", item)
    
    # 运行测试函数
    asyncio.run(test_scraper()) 